import { Role, UserPayload } from '@app/common';
import { ConflictException, Injectable, Logger, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthTokenDto } from './dto/auth-token.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { User } from './users/user.schema';
import { UsersRepository } from './users/users.repository';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL', '');
    const password = this.config.get<string>('ADMIN_PASSWORD', '');
    if (!email || !password) return;
    if (await this.usersRepository.findOneOrNull({ email: email.toLowerCase() })) return;
    await this.createUser({ email, password, name: 'Administrador' }, [Role.Admin]);
    this.logger.log(`Usuario administrador ${email} creado`);
  }

  async register(dto: RegisterDto): Promise<AuthTokenDto> {
    const user = await this.createUser(dto, [Role.Customer]);
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthTokenDto> {
    const user = await this.usersRepository.findOneOrNull({ email: dto.email.toLowerCase() });
    // Mismo mensaje para correo inexistente y clave errada: no revela qué correos existen.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.issueToken(user);
  }

  async profile(userId: string): Promise<UserProfileDto> {
    return this.toProfile(await this.usersRepository.findOne({ _id: userId }));
  }

  private async createUser(dto: RegisterDto, roles: Role[]): Promise<User> {
    const email = dto.email.toLowerCase();
    if (await this.usersRepository.findOneOrNull({ email })) {
      throw new ConflictException('El correo ya está registrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.usersRepository.create({ email, passwordHash, name: dto.name ?? '', roles });
  }

  private async issueToken(user: User): Promise<AuthTokenDto> {
    const payload: UserPayload = { sub: user._id.toString(), email: user.email, roles: user.roles };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '1h'),
      user: this.toProfile(user),
    };
  }

  private toProfile(user: User): UserProfileDto {
    return { id: user._id.toString(), email: user.email, name: user.name, roles: user.roles };
  }
}
