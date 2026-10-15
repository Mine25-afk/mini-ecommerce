// Alta de producto (solo admin).
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Café de altura 500 g' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string = '';

  @ApiPropertyOptional({ example: 'Café hondureño de Marcala, tostado medio' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description: string = '';

  @ApiProperty({ example: 'CAF-500' })
  @Matches(/^[A-Za-z0-9-]{3,32}$/)
  sku: string = '';

  @ApiPropertyOptional({ example: 'cafe' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category: string = '';

  @ApiProperty({ example: 189.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price: number = 0;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  stock: number = 0;
}
