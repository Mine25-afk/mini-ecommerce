import { CurrentUser, JwtAuthGuard, PaginationQueryDto, ParseObjectIdPipe, UserPayload } from '@app/common';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiForbiddenResponse, ApiTags } from '@nestjs/swagger';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiConflictResponse({ description: 'Stock insuficiente o producto inexistente' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: UserPayload) {
    return this.ordersService.create(dto, user);
  }

  @Get()
  findMine(@Query() query: PaginationQueryDto, @CurrentUser() user: UserPayload) {
    return this.ordersService.findMine(user, query);
  }

  @Get(':id')
  @ApiForbiddenResponse({ description: 'El pedido no te pertenece' })
  findOne(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: UserPayload) {
    return this.ordersService.findOne(id, user);
  }
}
