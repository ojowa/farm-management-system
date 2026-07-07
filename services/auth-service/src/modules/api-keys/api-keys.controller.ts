import { Controller, Get, Post, Patch, Delete, Body, Param, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { prisma } from '@farm/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

@Controller('api-keys')
export class ApiKeysController {
  @Get()
  async findAll(@Req() req: any) {
    return prisma.apiKey.findMany({ where: { userId: req.user.sub }, select: { id: true, name: true, keyPrefix: true, service: true, isActive: true, lastUsedAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    const { name, service } = body;
    if (!name?.trim()) throw new Error('Name is required');
    const rawKey = `fm_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 10);
    const keyHash = await bcrypt.hash(rawKey, 10);
    const apiKey = await prisma.apiKey.create({ data: { userId: req.user.sub, name: name.trim(), keyPrefix, keyHash, service: service || 'other' }, select: { id: true, name: true, keyPrefix: true, service: true, isActive: true, createdAt: true } });
    return { ...apiKey, key: rawKey };
  }

  @Patch(':id/toggle')
  @HttpCode(HttpStatus.OK)
  async toggle(@Param('id') id: string, @Req() req: any) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId: req.user.sub } });
    if (!key) throw new Error('API key not found');
    return prisma.apiKey.update({ where: { id: key.id }, data: { isActive: !key.isActive }, select: { id: true, name: true, keyPrefix: true, service: true, isActive: true, lastUsedAt: true, createdAt: true } });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Req() req: any) {
    const key = await prisma.apiKey.findFirst({ where: { id, userId: req.user.sub } });
    if (!key) throw new Error('API key not found');
    await prisma.apiKey.delete({ where: { id: key.id } });
  }
}
