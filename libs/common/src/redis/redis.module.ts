import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const logger = new Logger('Redis');
        // Sin cola offline: si Redis cae, el comando falla rápido y se lee de MongoDB.
        const client = new Redis(config.getOrThrow<string>('REDIS_URI'), {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        });
        client.on('error', (error) => logger.warn(`Redis no disponible: ${error.message}`));
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
