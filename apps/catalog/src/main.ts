import { CATALOG_SERVICE, RmqService, setupApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { CatalogModule } from './catalog.module';

// App híbrida: API HTTP del catálogo + consumidor RabbitMQ de la cola CATALOG.
async function bootstrap() {
  const app = await NestFactory.create(CatalogModule);
  setupApp(app, 'Catalog API', 'Productos, búsqueda y stock con caché en Redis');
  app.connectMicroservice(app.get(RmqService).getOptions(CATALOG_SERVICE, false));
  await app.startAllMicroservices();
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
bootstrap();
