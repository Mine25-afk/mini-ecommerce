import { baseEnvSchema } from '@app/common';
import * as Joi from 'joi';

export const orderEnvSchema = baseEnvSchema.keys({
  RABBIT_MQ_URI: Joi.string()
    .uri({ scheme: ['amqp', 'amqps'] })
    .required(),
  RABBIT_MQ_CATALOG_QUEUE: Joi.string().required(),
});
