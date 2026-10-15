import { PaginatedResult, Product, REDIS_CLIENT } from '@app/common';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ListProductsQueryDto } from './dto/list-products-query.dto';

const PREFIX = 'catalog';
const LIST_VERSION_KEY = `${PREFIX}:list:version`;

// Caché del catálogo. Un fallo de Redis nunca rompe la request: se trata como "miss" y se lee de MongoDB.
@Injectable()
export class ProductCacheService {
  private readonly logger = new Logger(ProductCacheService.name);
  private readonly ttl: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.ttl = config.get<number>('CACHE_TTL_SECONDS', 300);
  }

  getProduct(id: string): Promise<Product | null> {
    return this.read<Product>(this.productKey(id));
  }

  setProduct(product: Product): Promise<void> {
    return this.write(this.productKey(product._id.toString()), product);
  }

  async getList(query: ListProductsQueryDto): Promise<PaginatedResult<Product> | null> {
    return this.read<PaginatedResult<Product>>(await this.listKey(query));
  }

  async setList(query: ListProductsQueryDto, result: PaginatedResult<Product>): Promise<void> {
    await this.write(await this.listKey(query), result);
  }

  // Borra el detalle de cada producto y sube la versión de listados: las claves viejas mueren por TTL.
  async invalidateProducts(ids: string[]): Promise<void> {
    const pipeline = this.redis.multi();
    if (ids.length) pipeline.del(...ids.map((id) => this.productKey(id)));
    pipeline.incr(LIST_VERSION_KEY);
    await pipeline.exec();
  }

  private productKey(id: string) {
    return `${PREFIX}:product:${id}`;
  }

  private async listKey(query: ListProductsQueryDto) {
    const version = (await this.safe(() => this.redis.get(LIST_VERSION_KEY))) ?? '0';
    const search = (query.search ?? '').trim().toLowerCase();
    const category = (query.category ?? '').trim().toLowerCase();
    return `${PREFIX}:list:v${version}:p${query.page}:l${query.limit}:c${category}:s${search}`;
  }

  private async read<T>(key: string): Promise<T | null> {
    const raw = await this.safe(() => this.redis.get(key));
    return raw ? (JSON.parse(raw) as T) : null;
  }

  private async write(key: string, value: unknown): Promise<void> {
    await this.safe(() => this.redis.set(key, JSON.stringify(value), 'EX', this.ttl));
  }

  private async safe<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logger.warn(`Caché no disponible: ${(error as Error).message}`);
      return null;
    }
  }
}
