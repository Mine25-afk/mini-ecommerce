// Esquema de pedido del servicio order.
import { AbstractDocument } from '@app/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { OrderItem, OrderItemSchema } from './order-item.schema';
import { OrderStatus } from './order-status.enum';

@Schema({ versionKey: false, timestamps: true, collection: 'orders' })
export class Order extends AbstractDocument {
  @Prop({ type: SchemaTypes.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[] = [];

  @Prop({ required: true, min: 0 })
  total: number = 0;

  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.Pending })
  status: OrderStatus = OrderStatus.Pending;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
