import { AbstractRepository, Product } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

@Injectable()
export class ProductsRepository extends AbstractRepository<Product> {
  protected readonly logger = new Logger(ProductsRepository.name);

  constructor(@InjectModel(Product.name) model: Model<Product>, @InjectConnection() connection: Connection) {
    super(model, connection);
  }
}
