import { DatabaseModule, HealthModule, JwtAuthModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { authEnvSchema } from './config/env.schema';
import { User, UserSchema } from './users/user.schema';
import { UsersRepository } from './users/users.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: 'apps/auth/.env', validationSchema: authEnvSchema }),
    DatabaseModule,
    DatabaseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') },
      }),
      inject: [ConfigService],
    }),
    JwtAuthModule,
    HealthModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository],
})
export class AuthModule {}
