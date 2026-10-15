import { AbstractRepository, Product } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';

// Acceso de order a la colección products: solo lectura de precio y descuento de stock.
@Injectable()
export class StockRepository extends AbstractRepository<Product> {
  protected readonly logger = new Logger(StockRepository.name);

  constructor(@InjectModel(Product.name) model: Model<Product>, @InjectConnection() connection: Connection) {
    super(model, connection);
  }

  // Condición y descuento en una sola operación atómica: dos pedidos no pueden vender la misma última unidad.
  async reserve(productId: string, quantity: number, session: ClientSession): Promise<Product | null> {
    return this.model
      .findOneAndUpdate(
        { _id: productId, active: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
        { new: true, session },
      )
      .lean<Product>(true);
  }
}
