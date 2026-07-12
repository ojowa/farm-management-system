import { Controller, Get, Post, Patch, Delete, Body, Param, Req } from '@nestjs/common';
import { ApiKeysService } from '../../application/services/api-keys.service';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  list(@Req() req: any) {
    return this.apiKeysService.list(req.user?.sub);
  }

  @Post()
  create(@Req() req: any, @Body() body: { name: string; service: string }) {
    return this.apiKeysService.create(req.user?.sub, body);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.toggle(id, req.user?.sub);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.delete(id, req.user?.sub);
  }
}
