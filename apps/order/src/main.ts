import { setupApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  setupApp(app, 'Order API', 'Pedidos con transacción de stock y evento order.created');
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
bootstrap();
