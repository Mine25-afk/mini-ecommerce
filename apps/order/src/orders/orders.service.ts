import {
  CATALOG_SERVICE,
  ORDER_CREATED,
  OrderCreatedEvent,
  PaginatedResult,
  PaginationQueryDto,
  Role,
  UserPayload,
} from '@app/common';
import { ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Types } from 'mongoose';
import { lastValueFrom, timeout } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersRepository } from './orders.repository';
import { OrderItem } from './schemas/order-item.schema';
import { OrderStatus } from './schemas/order-status.enum';
import { Order } from './schemas/order.schema';
import { StockRepository } from './stock.repository';

const round2 = (value: number) => Math.round(value * 100) / 100;
// Si RabbitMQ no responde, la request no se queda colgada esperando el emit.
const EMIT_TIMEOUT_MS = 5000;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly stockRepository: StockRepository,
    @Inject(CATALOG_SERVICE) private readonly catalogClient: ClientProxy,
  ) {}

  async create(dto: CreateOrderDto, user: UserPayload): Promise<Order> {
    // Todo o nada: si un producto no alcanza, se revierte el stock ya descontado de los anteriores.
    const order = await this.ordersRepository.withTransaction(async (session) => {
      const items: OrderItem[] = [];
      for (const { productId, quantity } of dto.items) {
        const product = await this.stockRepository.reserve(productId, quantity, session);
        if (!product) throw new ConflictException(`Stock insuficiente o producto inexistente: ${productId}`);
        items.push({
          productId: product._id,
          sku: product.sku,
          name: product.name,
          unitPrice: product.price,
          quantity,
          subtotal: round2(product.price * quantity),
        });
      }
      const total = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
      return this.ordersRepository.create(
        { userId: new Types.ObjectId(user.sub), items, total, status: OrderStatus.Pending },
        { session },
      );
    });

    await this.publishOrderCreated(order);
    return order;
  }

  findMine(user: UserPayload, query: PaginationQueryDto): Promise<PaginatedResult<Order>> {
    return this.ordersRepository.paginate(
      { userId: new Types.ObjectId(user.sub) },
      { page: query.page, limit: query.limit, sort: { createdAt: -1 } },
    );
  }

  async findOne(id: string, user: UserPayload): Promise<Order> {
    const order = await this.ordersRepository.findOne({ _id: id });
    if (order.userId.toString() !== user.sub && !user.roles.includes(Role.Admin)) {
      throw new ForbiddenException('El pedido no te pertenece');
    }
    return order;
  }

  // Se publica después del commit: un consumidor nunca ve un pedido que luego se revirtió.
  private async publishOrderCreated(order: Order) {
    const event: OrderCreatedEvent = {
      orderId: order._id.toString(),
      userId: order.userId.toString(),
      total: order.total,
      items: order.items.map((item) => ({ productId: item.productId.toString(), quantity: item.quantity })),
      createdAt: (order.createdAt ?? new Date()).toISOString(),
    };
    try {
      await lastValueFrom(this.catalogClient.emit(ORDER_CREATED, event).pipe(timeout(EMIT_TIMEOUT_MS)));
    } catch (error) {
      // El pedido ya es válido; perder el evento solo deja la caché del catálogo vieja hasta su TTL.
      const reason = error instanceof Error ? error.message : JSON.stringify(error);
      this.logger.error(`No se publicó ${ORDER_CREATED} del pedido ${event.orderId}: ${reason}`);
    }
  }
}
