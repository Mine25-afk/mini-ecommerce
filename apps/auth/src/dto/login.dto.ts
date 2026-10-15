// Credenciales de inicio de sesión.
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'cliente@correo.com' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'Secreta123!' })
  @IsString()
  @IsNotEmpty()
  password: string = '';
}
