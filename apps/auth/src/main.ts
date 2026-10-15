import { setupApp } from '@app/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  setupApp(app, 'Auth API', 'Registro, login y emisión de JWT');
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
bootstrap();
