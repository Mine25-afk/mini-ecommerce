// Contenido del JWT que viaja entre servicios.
import { Role } from './role.enum';

export interface UserPayload {
  sub: string;
  email: string;
  roles: Role[];
}
