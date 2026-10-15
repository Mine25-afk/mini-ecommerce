import { Role } from '@app/common';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { User } from './users/user.schema';
import { UsersRepository } from './users/users.repository';

describe('AuthService', () => {
  let service: AuthService;
  let repository: { findOneOrNull: jest.Mock; findOne: jest.Mock; create: jest.Mock };
  let jwt: { signAsync: jest.Mock };
  const env: Record<string, string> = {};

  const buildUser = (overrides: Partial<User> = {}): User => ({
    _id: new Types.ObjectId(),
    email: 'ana@correo.com',
    passwordHash: bcrypt.hashSync('Secreta123!', 4),
    name: 'Ana',
    roles: [Role.Customer],
    ...overrides,
  });

  beforeEach(async () => {
    repository = { findOneOrNull: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    jwt = { signAsync: jest.fn().mockResolvedValue('token.jwt') };
    for (const key of Object.keys(env)) delete env[key];

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: repository },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: (key: string, fallback: string) => env[key] ?? fallback } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('guarda el correo en minúsculas, hashea la clave y devuelve un JWT de cliente', async () => {
      repository.findOneOrNull.mockResolvedValue(null);
      repository.create.mockImplementation(async (doc) => ({ _id: new Types.ObjectId(), ...doc }));

      const result = await service.register({ email: 'Ana@Correo.com', password: 'Secreta123!', name: 'Ana' });

      const saved = repository.create.mock.calls[0][0];
      expect(saved.email).toBe('ana@correo.com');
      expect(saved.passwordHash).not.toBe('Secreta123!');
      expect(await bcrypt.compare('Secreta123!', saved.passwordHash)).toBe(true);
      expect(saved.roles).toEqual([Role.Customer]);
      expect(result.accessToken).toBe('token.jwt');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('rechaza un correo ya registrado con 409', async () => {
      repository.findOneOrNull.mockResolvedValue(buildUser());

      await expect(service.register({ email: 'ana@correo.com', password: 'Secreta123!', name: '' })).rejects.toThrow(
        ConflictException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('firma el JWT con sub, email y roles', async () => {
      const user = buildUser({ roles: [Role.Admin] });
      repository.findOneOrNull.mockResolvedValue(user);

      await service.login({ email: 'ANA@correo.com', password: 'Secreta123!' });

      expect(repository.findOneOrNull).toHaveBeenCalledWith({ email: 'ana@correo.com' });
      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: user._id.toString(), email: user.email, roles: [Role.Admin] });
    });

    it.each([
      ['la clave es incorrecta', buildUser()],
      ['el correo no existe', null],
    ])('responde 401 genérico cuando %s', async (_caso, user) => {
      repository.findOneOrNull.mockResolvedValue(user);

      await expect(service.login({ email: 'ana@correo.com', password: 'Otra123!' })).rejects.toThrow(
        new UnauthorizedException('Credenciales inválidas'),
      );
      expect(jwt.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('admin semilla', () => {
    it('crea el admin si está configurado y no existe', async () => {
      env.ADMIN_EMAIL = 'admin@tienda.dev';
      env.ADMIN_PASSWORD = 'Admin123!';
      repository.findOneOrNull.mockResolvedValue(null);
      repository.create.mockImplementation(async (doc) => ({ _id: new Types.ObjectId(), ...doc }));

      await service.onApplicationBootstrap();

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ roles: [Role.Admin] }));
    });

    it('no hace nada sin variables de entorno', async () => {
      await service.onApplicationBootstrap();
      expect(repository.findOneOrNull).not.toHaveBeenCalled();
    });
  });
});
