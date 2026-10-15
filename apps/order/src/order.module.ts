import {
  CATALOG_SERVICE,
  DatabaseModule,
  HealthModule,
  JwtAuthModule,
  Product,
  ProductSchema,
  RmqModule,
} from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { orderEnvSchema } from './config/env.schema';
import { OrdersController } from './orders/orders.controller';
import { OrdersRepository } from './orders/orders.repository';
import { OrdersService } from './orders/orders.service';
import { Order, OrderSchema } from './orders/schemas/order.schema';
import { StockRepository } from './orders/stock.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/order/.env', validationSchema: orderEnvSchema }),
    DatabaseModule,
    DatabaseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    RmqModule.register({ name: CATALOG_SERVICE }),
    JwtAuthModule,
    HealthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, StockRepository],
})
export class OrderModule {}
