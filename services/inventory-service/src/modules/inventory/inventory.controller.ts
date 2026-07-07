import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { ZodValidationPipe } from '@farm/utils';
import { createInventoryItemSchema, updateInventoryItemSchema } from '@farm/validation';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createInventoryItemSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.inventoryService.createInventoryItem(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const filter: any = {};
    if (farmId) filter.farmId = farmId;
    if (category) filter.category = category;
    if (search) filter.search = search;
    return this.inventoryService.getAllInventoryItems(filter, sortBy || 'createdAt', sortOrder || 'desc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inventoryService.getInventoryItemById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateInventoryItemSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.inventoryService.updateInventoryItem(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.inventoryService.deleteInventoryItem(id);
  }
}
