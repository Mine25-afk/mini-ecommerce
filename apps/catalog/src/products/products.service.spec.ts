import { Product } from '@app/common';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductCacheService } from './product-cache.service';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: Record<'paginate' | 'findOneOrNull' | 'create' | 'findOneAndUpdate', jest.Mock>;
  let cache: Record<'getList' | 'setList' | 'getProduct' | 'setProduct' | 'invalidateProducts', jest.Mock>;

  const product: Product = {
    _id: new Types.ObjectId(),
    name: 'Café 500 g',
    description: '',
    sku: 'CAF-500',
    category: 'cafe',
    price: 189.5,
    stock: 10,
    active: true,
  };

  const query = (overrides: Partial<ListProductsQueryDto> = {}) =>
    Object.assign(new ListProductsQueryDto(), overrides) as ListProductsQueryDto;

  beforeEach(async () => {
    repository = { paginate: jest.fn(), findOneOrNull: jest.fn(), create: jest.fn(), findOneAndUpdate: jest.fn() };
    cache = {
      getList: jest.fn().mockResolvedValue(null),
      setList: jest.fn(),
      getProduct: jest.fn().mockResolvedValue(null),
      setProduct: jest.fn(),
      invalidateProducts: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: repository },
        { provide: ProductCacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  describe('list', () => {
    it('devuelve la caché sin consultar MongoDB', async () => {
      const cached = { items: [product], total: 1, page: 1, limit: 20, pages: 1 };
      cache.getList.mockResolvedValue(cached);

      await expect(service.list(query())).resolves.toBe(cached);
      expect(repository.paginate).not.toHaveBeenCalled();
    });

    it('en un miss arma el filtro de texto y categoría, consulta y guarda en caché', async () => {
      const page = { items: [product], total: 1, page: 2, limit: 5, pages: 1 };
      repository.paginate.mockResolvedValue(page);

      await service.list(query({ page: 2, limit: 5, search: 'café', category: 'CAFE' }));

      expect(repository.paginate).toHaveBeenCalledWith(
        { active: true, category: 'cafe', $text: { $search: 'café' } },
        { page: 2, limit: 5, sort: { name: 1 } },
      );
      expect(cache.setList).toHaveBeenCalledWith(expect.anything(), page);
    });
  });

  describe('findOne', () => {
    it('responde 404 si el producto no existe o está inactivo', async () => {
      repository.findOneOrNull.mockResolvedValue(null);
      await expect(service.findOne(product._id.toString())).rejects.toThrow(NotFoundException);
      expect(cache.setProduct).not.toHaveBeenCalled();
    });

    it('cachea el producto leído de MongoDB', async () => {
      repository.findOneOrNull.mockResolvedValue(product);
      await expect(service.findOne(product._id.toString())).resolves.toBe(product);
      expect(cache.setProduct).toHaveBeenCalledWith(product);
    });
  });

  it('traduce el índice único de SKU a 409', async () => {
    repository.create.mockRejectedValue(Object.assign(new Error('E11000 duplicate key'), { code: 11000 }));

    await expect(
      service.create({ name: 'X', description: '', sku: 'CAF-500', category: '', price: 1, stock: 1 }),
    ).rejects.toThrow(ConflictException);
  });

  it('en un PATCH solo actualiza los campos enviados e invalida la caché del producto', async () => {
    repository.findOneAndUpdate.mockResolvedValue(product);
    const id = product._id.toString();

    await service.update(id, { price: 200, name: undefined });

    expect(repository.findOneAndUpdate).toHaveBeenCalledWith({ _id: id, active: true }, { $set: { price: 200 } });
    expect(cache.invalidateProducts).toHaveBeenCalledWith([id]);
  });
});
