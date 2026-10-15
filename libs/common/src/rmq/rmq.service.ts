import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RmqContext, RmqOptions, Transport } from '@nestjs/microservices';

@Injectable()
export class RmqService {
  constructor(private readonly config: ConfigService) {}

  // noAck=false: el mensaje solo sale de la cola cuando el consumidor confirma.
  getOptions(queue: string, noAck = false): RmqOptions {
    return {
      transport: Transport.RMQ,
      options: {
        urls: [this.config.getOrThrow<string>('RABBIT_MQ_URI')],
        queue: this.config.getOrThrow<string>(`RABBIT_MQ_${queue}_QUEUE`),
        noAck,
        persistent: true,
        prefetchCount: 10,
        queueOptions: { durable: true },
      },
    };
  }

  ack(context: RmqContext) {
    context.getChannelRef().ack(context.getMessage());
  }

  // requeue=false evita el bucle infinito con un mensaje que siempre falla.
  nack(context: RmqContext, requeue = false) {
    context.getChannelRef().nack(context.getMessage(), false, requeue);
  }
}
