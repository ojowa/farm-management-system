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
import { PoultryService } from './poultry.service';
import { ZodValidationPipe } from '@farm/utils';
import { createBreedSchema, updateBreedSchema } from '@farm/validation';

@Controller('api/breeds')
export class BreedsController {
  constructor(private readonly poultryService: PoultryService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createBreedSchema))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: any) {
    return this.poultryService.createBreed(data);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('name') name?: string,
    @Query('birdType') birdType?: string,
  ) {
    const filter: any = {};
    if (name) filter.name = name;
    if (birdType) filter.birdType = birdType;
    return this.poultryService.getAllBreeds(filter, sortBy || 'name', sortOrder || 'asc', parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.poultryService.getBreedById(id);
  }

  @Put(':id')
  @UsePipes(new ZodValidationPipe(updateBreedSchema))
  async update(@Param('id') id: string, @Body() data: any) {
    return this.poultryService.updateBreed(id, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.poultryService.deleteBreed(id);
  }
}
