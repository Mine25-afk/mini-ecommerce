// Contrato del evento order.created.
export interface OrderCreatedItem {
  productId: string;
  quantity: number;
}

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  total: number;
  items: OrderCreatedItem[];
  createdAt: string;
}
