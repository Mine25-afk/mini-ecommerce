import { baseEnvSchema } from '@app/common';
import * as Joi from 'joi';

export const catalogEnvSchema = baseEnvSchema.keys({
  REDIS_URI: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  RABBIT_MQ_URI: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .required(),
  RABBIT_MQ_CATALOG_QUEUE: Joi.string().required(),
  CACHE_TTL_SECONDS: Joi.number().integer().min(1).default(300),
});
