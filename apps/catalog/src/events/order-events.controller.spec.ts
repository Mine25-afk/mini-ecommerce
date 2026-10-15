import { OrderCreatedEvent, RmqService } from '@app/common';
import { RmqContext } from '@nestjs/microservices';
import { ProductCacheService } from '../products/product-cache.service';
import { OrderEventsController } from './order-events.controller';

describe('OrderEventsController', () => {
  const event: OrderCreatedEvent = {
    orderId: 'o1',
    userId: 'u1',
    total: 379,
    items: [
      { productId: 'p1', quantity: 2 },
      { productId: 'p2', quantity: 1 },
    ],
    createdAt: new Date().toISOString(),
  };
  const context = {} as RmqContext;
  let cache: { invalidateProducts: jest.Mock };
  let rmq: { ack: jest.Mock; nack: jest.Mock };
  let controller: OrderEventsController;

  beforeEach(() => {
    cache = { invalidateProducts: jest.fn() };
    rmq = { ack: jest.fn(), nack: jest.fn() };
    controller = new OrderEventsController(cache as unknown as ProductCacheService, rmq as unknown as RmqService);
  });

  it('invalida la caché de los productos del pedido y confirma (ack) el mensaje', async () => {
    await controller.handleOrderCreated(event, context);

    expect(cache.invalidateProducts).toHaveBeenCalledWith(['p1', 'p2']);
    expect(rmq.ack).toHaveBeenCalledWith(context);
    expect(rmq.nack).not.toHaveBeenCalled();
  });

  it('rechaza (nack) el mensaje si el procesamiento falla, sin hacer ack', async () => {
    cache.invalidateProducts.mockRejectedValue(new Error('Redis caído'));

    await controller.handleOrderCreated(event, context);

    expect(rmq.nack).toHaveBeenCalledWith(context);
    expect(rmq.ack).not.toHaveBeenCalled();
  });
});
