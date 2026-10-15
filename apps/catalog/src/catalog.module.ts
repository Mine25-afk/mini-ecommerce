import {
  DatabaseModule,
  HealthModule,
  JwtAuthModule,
  Product,
  ProductSchema,
  RedisModule,
  RmqModule,
} from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { catalogEnvSchema } from './config/env.schema';
import { OrderEventsController } from './events/order-events.controller';
import { ProductCacheService } from './products/product-cache.service';
import { ProductsController } from './products/products.controller';
import { ProductsRepository } from './products/products.repository';
import { ProductsService } from './products/products.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/catalog/.env', validationSchema: catalogEnvSchema }),
    DatabaseModule,
    DatabaseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    RedisModule,
    RmqModule,
    JwtAuthModule,
    HealthModule,
  ],
  controllers: [ProductsController, OrderEventsController],
  providers: [ProductsService, ProductsRepository, ProductCacheService],
})
export class CatalogModule {}
