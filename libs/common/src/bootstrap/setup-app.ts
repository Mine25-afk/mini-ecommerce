import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Configuración HTTP común a todos los servicios: validación global, Swagger y apagado limpio.
export function setupApp(app: INestApplication, title: string, description: string) {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle(title).setDescription(description).setVersion('1.0').addBearerAuth().build(),
  );
  SwaggerModule.setup('docs', app, document);
}
