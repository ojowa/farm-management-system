import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PlatformBroadcastService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';

@Controller('platform-broadcasts')
@UseGuards(JwtAuthGuard, AuthorizationGuard, PlatformAdminGuard)
export class PlatformBroadcastsController {
  constructor(private readonly broadcastService: PlatformBroadcastService) {}

  @Get()
  @Permission('platform.manage')
  findAll() {
    return this.broadcastService.findAllBroadcasts();
  }

  @Get(':id')
  @Permission('platform.manage')
  findOne(@Param('id') id: string) {
    return this.broadcastService.findBroadcast(id);
  }

  @Post()
  @Permission('platform.manage')
  create(@Body() body: { title: string; message: string; type?: string }, @Req() req: any) {
    return this.broadcastService.createBroadcast(body, req.user.id);
  }

  @Patch(':id')
  @Permission('platform.manage')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.broadcastService.updateBroadcast(id, body, req.user.id);
  }

  @Delete(':id')
  @Permission('platform.manage')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.broadcastService.deleteBroadcast(id, req.user.id);
  }
}
