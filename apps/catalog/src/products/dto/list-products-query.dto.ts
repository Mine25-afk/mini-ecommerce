// Filtros del listado público del catálogo.
import { PaginationQueryDto } from '@app/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'café' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search: string = '';

  @ApiPropertyOptional({ example: 'cafe' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category: string = '';
}
