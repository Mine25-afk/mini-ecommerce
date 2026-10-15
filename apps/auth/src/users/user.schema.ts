// Esquema de usuario del servicio auth.
import { AbstractDocument, Role } from '@app/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ versionKey: false, timestamps: true, collection: 'users' })
export class User extends AbstractDocument {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string = '';

  @Prop({ required: true })
  passwordHash: string = '';

  @Prop({ default: '', trim: true })
  name: string = '';

  @Prop({ type: [String], enum: Object.values(Role), default: [Role.Customer] })
  roles: Role[] = [Role.Customer];

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
