import { baseEnvSchema } from '@app/common';
import * as Joi from 'joi';

export const authEnvSchema = baseEnvSchema.keys({
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  // Admin semilla opcional: sin él no hay forma de crear productos en una base vacía.
  ADMIN_EMAIL: Joi.string().email().allow('').default(''),
  ADMIN_PASSWORD: Joi.string().min(8).allow('').default(''),
});
