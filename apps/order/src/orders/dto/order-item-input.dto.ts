// Producto y cantidad pedidos por el cliente.
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';

export class OrderItemInputDto {
  @ApiProperty({ example: '6710c0ffee0000000000abcd' })
  @IsMongoId()
  productId: string = '';

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number = 0;
}
