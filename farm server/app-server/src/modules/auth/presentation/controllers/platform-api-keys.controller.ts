import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ApiKeysService } from '../../application/services/api-keys.service';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('platform-api-keys')
export class PlatformApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Permission('apikey.read')
  @Get()
  list() {
    return this.apiKeysService.listAll();
  }

  @Permission('apikey.write')
  @Post()
  create(@Req() req: any, @Body() body: { name: string; service: string }) {
    return this.apiKeysService.create(req.user?.sub, body);
  }

  @Permission('apikey.write')
  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.toggle(id, req.user?.sub);
  }

  @Permission('apikey.write')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.apiKeysService.delete(id, req.user?.sub);
  }
}
