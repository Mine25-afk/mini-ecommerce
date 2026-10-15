import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from './user-payload';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserPayload => context.switchToHttp().getRequest().user,
);
