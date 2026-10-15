import { PaginatedResult, Product } from '@app/common';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductCacheService } from './product-cache.service';
import { ProductsRepository } from './products.repository';

const DUPLICATE_KEY = 11000;

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly cache: ProductCacheService,
  ) {}

  async list(query: ListProductsQueryDto): Promise<PaginatedResult<Product>> {
    const cached = await this.cache.getList(query);
    if (cached) return cached;

    const filter: FilterQuery<Product> = { active: true };
    if (query.category) filter.category = query.category.toLowerCase();
    if (query.search) filter.$text = { $search: query.search };

    const result = await this.productsRepository.paginate(filter, {
      page: query.page,
      limit: query.limit,
      sort: { name: 1 },
    });
    await this.cache.setList(query, result);
    return result;
  }

  async findOne(id: string): Promise<Product> {
    const cached = await this.cache.getProduct(id);
    if (cached) return cached;

    const product = await this.productsRepository.findOneOrNull({ _id: id, active: true });
    if (!product) throw new NotFoundException('Producto no encontrado');
    await this.cache.setProduct(product);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    try {
      const product = await this.productsRepository.create({
        name: dto.name,
        description: dto.description ?? '',
        sku: dto.sku,
        category: dto.category ?? '',
        price: dto.price,
        stock: dto.stock,
        active: true,
      });
      await this.cache.invalidateProducts([]);
      return product;
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) throw new ConflictException('El SKU ya existe');
      throw error;
    }
  }

  // UpdateProductDto no lleva defaults: en un PATCH un default pisaría el campo que el cliente no mandó.
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    const product = await this.productsRepository.findOneAndUpdate({ _id: id, active: true }, { $set: changes });
    await this.cache.invalidateProducts([id]);
    return product;
  }

  // Borrado lógico: los pedidos históricos siguen apuntando a un producto existente.
  async remove(id: string): Promise<void> {
    await this.productsRepository.findOneAndUpdate({ _id: id, active: true }, { $set: { active: false } });
    await this.cache.invalidateProducts([id]);
  }
}
