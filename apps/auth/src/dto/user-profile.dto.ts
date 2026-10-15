// Perfil público del usuario (sin hash de contraseña).
import { Role } from '@app/common';
import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  email: string = '';

  @ApiProperty()
  name: string = '';

  @ApiProperty({ enum: Role, isArray: true })
  roles: Role[] = [];
}
