import { CATALOG_SERVICE, Product, ProductSchema, Role, UserPayload } from '@app/common';
import { ConflictException } from '@nestjs/common';
import { getConnectionToken, getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import { of } from 'rxjs';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { StockRepository } from './stock.repository';

// Integración contra un MongoDB real en replica set: prueba que el rollback de la transacción sí ocurre.
jest.setTimeout(120_000);

describe('OrdersService + MongoDB (transacción real)', () => {
  let replSet: MongoMemoryReplSet;
  let moduleRef: TestingModule;
  let service: OrdersService;
  let products: Model<Product>;
  let orders: Model<Order>;
  const emit = jest.fn(() => of(undefined));
  const user: UserPayload = { sub: new Types.ObjectId().toString(), email: 'ana@correo.com', roles: [Role.Customer] };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(replSet.getUri('mini-ecommerce-test')),
        MongooseModule.forFeature([
          { name: Order.name, schema: OrderSchema },
          { name: Product.name, schema: ProductSchema },
        ]),
      ],
      providers: [OrdersService, OrdersRepository, StockRepository, { provide: CATALOG_SERVICE, useValue: { emit } }],
    }).compile();

    service = moduleRef.get(OrdersService);
    products = moduleRef.get(getModelToken(Product.name));
    orders = moduleRef.get(getModelToken(Order.name));
    // Las colecciones deben existir antes de la primera transacción.
    await Promise.all([products.createCollection(), orders.createCollection()]);
  });

  afterAll(async () => {
    await moduleRef?.get<Connection>(getConnectionToken()).close();
    await moduleRef?.close();
    await replSet?.stop();
  });

  beforeEach(async () => {
    emit.mockClear();
    await Promise.all([products.deleteMany({}), orders.deleteMany({})]);
  });

  const seed = (sku: string, price: number, stock: number) =>
    products.create({ _id: new Types.ObjectId(), name: sku, sku, price, stock, active: true });

  it('crea el pedido y descuenta el stock en la misma transacción', async () => {
    const cafe = await seed('CAF-500', 189.5, 10);

    const order = await service.create({ items: [{ productId: cafe.id, quantity: 3 }] }, user);

    expect(order.total).toBe(568.5);
    expect((await products.findById(cafe._id).lean())?.stock).toBe(7);
    expect(await orders.countDocuments()).toBe(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('si el segundo producto no alcanza, revierte el stock ya descontado del primero', async () => {
    const cafe = await seed('CAF-500', 189.5, 10);
    const taza = await seed('TAZA-01', 120, 1);

    await expect(
      service.create(
        {
          items: [
            { productId: cafe.id, quantity: 4 },
            { productId: taza.id, quantity: 2 },
          ],
        },
        user,
      ),
    ).rejects.toThrow(ConflictException);

    expect((await products.findById(cafe._id).lean())?.stock).toBe(10);
    expect((await products.findById(taza._id).lean())?.stock).toBe(1);
    expect(await orders.countDocuments()).toBe(0);
    expect(emit).not.toHaveBeenCalled();
  });

  it('dos pedidos concurrentes por la última unidad: solo uno gana', async () => {
    const ultima = await seed('ULT-01', 50, 1);
    const pedido = () => service.create({ items: [{ productId: ultima.id, quantity: 1 }] }, user);

    const results = await Promise.allSettled([pedido(), pedido()]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await products.findById(ultima._id).lean())?.stock).toBe(0);
    expect(await orders.countDocuments()).toBe(1);
  });

  it('pagina los pedidos del cliente con total y número de páginas', async () => {
    const cafe = await seed('CAF-500', 10, 100);
    for (let i = 0; i < 5; i++) await service.create({ items: [{ productId: cafe.id, quantity: 1 }] }, user);

    const page = await service.findMine(user, { page: 2, limit: 2 });

    expect(page).toMatchObject({ total: 5, page: 2, limit: 2, pages: 3 });
    expect(page.items).toHaveLength(2);
  });
});
