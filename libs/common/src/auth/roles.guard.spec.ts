import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const contextFor = (user?: { roles: Role[] }) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  const guardRequiring = (roles?: Role[]) => new RolesGuard({ getAllAndOverride: () => roles } as unknown as Reflector);

  it('deja pasar si el endpoint no exige roles', () => {
    expect(guardRequiring(undefined).canActivate(contextFor())).toBe(true);
  });

  it('deja pasar a un usuario con el rol exigido', () => {
    expect(guardRequiring([Role.Admin]).canActivate(contextFor({ roles: [Role.Admin] }))).toBe(true);
  });

  it('bloquea a un usuario sin el rol exigido', () => {
    expect(guardRequiring([Role.Admin]).canActivate(contextFor({ roles: [Role.Customer] }))).toBe(false);
  });

  it('bloquea si no hay usuario autenticado', () => {
    expect(guardRequiring([Role.Admin]).canActivate(contextFor())).toBe(false);
  });
});
