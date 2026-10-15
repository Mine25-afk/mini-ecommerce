import { CATALOG_SERVICE, ORDER_CREATED, Role, UserPayload } from '@app/common';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { of, throwError } from 'rxjs';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { StockRepository } from './stock.repository';

describe('OrdersService', () => {
  const user: UserPayload = { sub: new Types.ObjectId().toString(), email: 'ana@correo.com', roles: [Role.Customer] };
  const session = { id: 'session' };
  const productA = { _id: new Types.ObjectId(), sku: 'A-1', name: 'A', price: 10.1, stock: 5, active: true };
  const productB = { _id: new Types.ObjectId(), sku: 'B-1', name: 'B', price: 0.2, stock: 5, active: true };

  let service: OrdersService;
  let orders: { withTransaction: jest.Mock; create: jest.Mock; findOne: jest.Mock; paginate: jest.Mock };
  let stock: { reserve: jest.Mock };
  let client: { emit: jest.Mock };

  beforeEach(async () => {
    orders = {
      withTransaction: jest.fn((work) => work(session)),
      create: jest.fn(async (doc) => ({ _id: new Types.ObjectId(), createdAt: new Date(), ...doc })),
      findOne: jest.fn(),
      paginate: jest.fn(),
    };
    stock = { reserve: jest.fn() };
    client = { emit: jest.fn(() => of(undefined)) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: orders },
        { provide: StockRepository, useValue: stock },
        { provide: CATALOG_SERVICE, useValue: client },
      ],
    }).compile();
    service = moduleRef.get(OrdersService);
  });

  it('reserva stock dentro de la transacción, guarda snapshot de precios y redondea el total', async () => {
    stock.reserve.mockResolvedValueOnce(productA).mockResolvedValueOnce(productB);

    const order = await service.create(
      {
        items: [
          { productId: productA._id.toString(), quantity: 3 },
          { productId: productB._id.toString(), quantity: 1 },
        ],
      },
      user,
    );

    expect(stock.reserve).toHaveBeenNthCalledWith(1, productA._id.toString(), 3, session);
    expect(stock.reserve).toHaveBeenNthCalledWith(2, productB._id.toString(), 1, session);
    expect(orders.create).toHaveBeenCalledWith(expect.anything(), { session });
    expect(order.items[0]).toMatchObject({ sku: 'A-1', unitPrice: 10.1, quantity: 3, subtotal: 30.3 });
    expect(order.total).toBe(30.5);
  });

  it('publica order.created después del commit con los productos y cantidades', async () => {
    stock.reserve.mockResolvedValue(productA);

    const order = await service.create({ items: [{ productId: productA._id.toString(), quantity: 2 }] }, user);

    expect(client.emit).toHaveBeenCalledWith(
      ORDER_CREATED,
      expect.objectContaining({
        orderId: order._id.toString(),
        userId: user.sub,
        items: [{ productId: productA._id.toString(), quantity: 2 }],
      }),
    );
    expect(orders.withTransaction.mock.invocationCallOrder[0]).toBeLessThan(client.emit.mock.invocationCallOrder[0]);
  });

  it('con stock insuficiente lanza 409, no crea el pedido ni publica el evento', async () => {
    stock.reserve.mockResolvedValueOnce(productA).mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          items: [
            { productId: productA._id.toString(), quantity: 1 },
            { productId: productB._id.toString(), quantity: 99 },
          ],
        },
        user,
      ),
    ).rejects.toThrow(ConflictException);
    expect(orders.create).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
  });

  it('si RabbitMQ falla el pedido igual se devuelve (ya está confirmado en MongoDB)', async () => {
    stock.reserve.mockResolvedValue(productA);
    client.emit.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));

    await expect(
      service.create({ items: [{ productId: productA._id.toString(), quantity: 1 }] }, user),
    ).resolves.toHaveProperty('total', 10.1);
  });

  describe('findOne', () => {
    const ajeno = { _id: new Types.ObjectId(), userId: new Types.ObjectId(), items: [], total: 0 };

    it('prohíbe ver el pedido de otro cliente', async () => {
      orders.findOne.mockResolvedValue(ajeno);
      await expect(service.findOne(ajeno._id.toString(), user)).rejects.toThrow(ForbiddenException);
    });

    it('un admin puede ver cualquier pedido', async () => {
      orders.findOne.mockResolvedValue(ajeno);
      const admin = { ...user, roles: [Role.Admin] };
      await expect(service.findOne(ajeno._id.toString(), admin)).resolves.toBe(ajeno);
    });
  });
});
