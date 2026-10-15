import { ORDER_CREATED, OrderCreatedEvent, RmqService } from '@app/common';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ProductCacheService } from '../products/product-cache.service';

@Controller()
export class OrderEventsController {
  private readonly logger = new Logger(OrderEventsController.name);

  constructor(
    private readonly cache: ProductCacheService,
    private readonly rmqService: RmqService,
  ) {}

  // El pedido ya descontó stock en MongoDB: aquí solo se invalida la caché de esos productos.
  @EventPattern(ORDER_CREATED)
  async handleOrderCreated(@Payload() event: OrderCreatedEvent, @Ctx() context: RmqContext) {
    try {
      await this.cache.invalidateProducts(event.items.map((item) => item.productId));
      this.rmqService.ack(context);
      this.logger.log(`Pedido ${event.orderId}: caché de ${event.items.length} producto(s) invalidada`);
    } catch (error) {
      this.logger.error(`No se pudo procesar el pedido ${event.orderId}: ${(error as Error).message}`);
      this.rmqService.nack(context);
    }
  }
}
