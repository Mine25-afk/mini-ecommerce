// Respuesta de login y registro.
import { ApiProperty } from '@nestjs/swagger';
import { UserProfileDto } from './user-profile.dto';

export class AuthTokenDto {
  @ApiProperty()
  accessToken: string = '';

  @ApiProperty({ example: '1h' })
  expiresIn: string = '';

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto = new UserProfileDto();
}
