// Alta de cliente.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'cliente@correo.com' })
  @IsEmail()
  email: string = '';

  @ApiProperty({
    example: 'Secreta123!',
    description: 'Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo',
  })
  @IsStrongPassword({ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 })
  password: string = '';

  @ApiPropertyOptional({ example: 'Ana López' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name: string = '';
}
