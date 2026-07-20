import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { PlatformBroadcastService } from '../../application/services/platform.service';
import { PlatformAdminGuard } from '../guards/platform-admin.guard';

@Controller('platform-broadcasts')
@UseGuards(PlatformAdminGuard)
export class PlatformBroadcastsController {
  constructor(private readonly broadcastService: PlatformBroadcastService) {}

  @Get()
  findAll() {
    return this.broadcastService.findAllBroadcasts();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.broadcastService.findBroadcast(id);
  }

  @Post()
  create(@Body() body: { title: string; message: string; type?: string }, @Request() req: any) {
    return this.broadcastService.createBroadcast(body, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.broadcastService.updateBroadcast(id, body, req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.broadcastService.deleteBroadcast(id, req.user.id);
  }
}
