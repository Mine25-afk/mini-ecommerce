import { Logger, NotFoundException } from '@nestjs/common';
import { ClientSession, Connection, FilterQuery, Model, SaveOptions, Types, UpdateQuery } from 'mongoose';
import { AbstractDocument } from './abstract.schema';
import { PaginatedResult, PaginateOptions } from './paginated-result';

// Repositorio genérico: CRUD, paginación con conteo y transacciones sobre un modelo Mongoose.
export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;

  constructor(
    protected readonly model: Model<TDocument>,
    private readonly connection: Connection,
  ) {}

  async create(document: Omit<TDocument, '_id'>, options?: SaveOptions): Promise<TDocument> {
    const created = new this.model({ ...document, _id: new Types.ObjectId() });
    return (await created.save(options)).toJSON() as unknown as TDocument;
  }

  async findOne(filter: FilterQuery<TDocument>): Promise<TDocument> {
    const document = await this.model.findOne(filter).lean<TDocument>(true);
    if (!document) {
      this.logger.warn(`Documento no encontrado con el filtro ${JSON.stringify(filter)}`);
      throw new NotFoundException('Documento no encontrado');
    }
    return document;
  }

  async findOneOrNull(filter: FilterQuery<TDocument>): Promise<TDocument | null> {
    return this.model.findOne(filter).lean<TDocument>(true);
  }

  async findOneAndUpdate(filter: FilterQuery<TDocument>, update: UpdateQuery<TDocument>): Promise<TDocument> {
    const document = await this.model.findOneAndUpdate(filter, update, { new: true }).lean<TDocument>(true);
    if (!document) {
      this.logger.warn(`Documento no encontrado con el filtro ${JSON.stringify(filter)}`);
      throw new NotFoundException('Documento no encontrado');
    }
    return document;
  }

  async find(filter: FilterQuery<TDocument>): Promise<TDocument[]> {
    return this.model.find(filter).lean<TDocument[]>(true);
  }

  async paginate(filter: FilterQuery<TDocument>, options: PaginateOptions): Promise<PaginatedResult<TDocument>> {
    const page = Math.max(1, options.page);
    const limit = Math.max(1, options.limit);
    // Página y total en paralelo: una sola ida y vuelta de latencia.
    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(options.sort ?? { _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<TDocument[]>(true),
      this.model.countDocuments(filter),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // Reintenta solo ante errores transitorios (WriteConflict); requiere MongoDB en replica set.
  async withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
    return this.connection.transaction(work);
  }
}
