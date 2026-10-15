// Esquema de producto compartido entre catalog (dueño) y order (descuenta stock).
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../database/abstract.schema';

@Schema({ versionKey: false, timestamps: true, collection: 'products' })
export class Product extends AbstractDocument {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ default: '' })
  description: string = '';

  @Prop({ required: true, uppercase: true, trim: true, unique: true })
  sku: string = '';

  @Prop({ default: '', lowercase: true, trim: true })
  category: string = '';

  @Prop({ required: true, min: 0 })
  price: number = 0;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number = 0;

  @Prop({ default: true })
  active: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text', description: 'text' }, { weights: { name: 3, description: 1 } });
ProductSchema.index({ active: 1, category: 1, price: 1 });
