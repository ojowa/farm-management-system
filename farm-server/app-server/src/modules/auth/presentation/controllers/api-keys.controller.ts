import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiKeysService } from '../../application/services/api-keys.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @Permission('apikey.read')
  list(@Req() req: any) {
    return this.apiKeysService.list(req.user?.sub);
  }

  @Post()
  @Permission('apikey.write')
  create(@Req() req: any, @Body() body: { name: string; service: string }) {
    return this.apiKeysService.create(req.user?.sub, body);
  }

  @Patch(':id/toggle')
  @Permission('apikey.write')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.toggle(id, req.user?.sub);
  }

  @Delete(':id')
  @Permission('apikey.write')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.delete(id, req.user?.sub);
  }
}
