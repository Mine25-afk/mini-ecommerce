import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductCacheService } from './product-cache.service';

describe('ProductCacheService', () => {
  const config = { get: () => 300 } as unknown as ConfigService;
  const query = Object.assign(new ListProductsQueryDto(), { page: 1, limit: 20, search: ' Café ', category: '' });

  it('usa la versión de listados en la clave y normaliza la búsqueda', async () => {
    const redis = { get: jest.fn().mockResolvedValueOnce('7').mockResolvedValueOnce(null) };
    const cache = new ProductCacheService(redis as unknown as Redis, config);

    await cache.getList(query);

    expect(redis.get).toHaveBeenLastCalledWith('catalog:list:v7:p1:l20:c:scafé');
  });

  it('trata un Redis caído como miss en lugar de romper la request', async () => {
    const redis = { get: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')), set: jest.fn() };
    const cache = new ProductCacheService(redis as unknown as Redis, config);

    await expect(cache.getProduct('abc')).resolves.toBeNull();
  });

  it('invalida el detalle de cada producto y sube la versión de listados en una sola transacción', async () => {
    const multi = { del: jest.fn(), incr: jest.fn(), exec: jest.fn().mockResolvedValue([]) };
    const redis = { multi: jest.fn(() => multi) };
    const cache = new ProductCacheService(redis as unknown as Redis, config);

    await cache.invalidateProducts(['a', 'b']);

    expect(multi.del).toHaveBeenCalledWith('catalog:product:a', 'catalog:product:b');
    expect(multi.incr).toHaveBeenCalledWith('catalog:list:version');
    expect(multi.exec).toHaveBeenCalled();
  });
});
