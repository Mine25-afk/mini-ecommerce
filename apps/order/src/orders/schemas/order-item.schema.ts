// Línea de pedido embebida con snapshot del producto al momento de la compra.
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false, versionKey: false })
export class OrderItem {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  sku: string = '';

  @Prop({ required: true })
  name: string = '';

  @Prop({ required: true, min: 0 })
  unitPrice: number = 0;

  @Prop({ required: true, min: 1 })
  quantity: number = 0;

  @Prop({ required: true, min: 0 })
  subtotal: number = 0;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
