import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth/nestjs';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: any): string {
  return String((req as any).user?.organizationId || (req as any)['x-organization-id'] || '');
}

function getUserPermissions(req: any): string[] {
  return (req as any).user?.permissions ?? [];
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('tasks')
export class TasksController {
  @Permission('hr.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('farmId') farmId?: string,
    @Query('search') search?: string,
  ) {
    const orgId = getOrgId(req);
    const user = (req as any).user;

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (farmId) where.farmId = farmId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (!getUserPermissions(req).includes('hr.write')) {
      where.assignedToId = user?.sub;
    } else if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const tasks = await scopedPrisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
    });

    const stats = await scopedPrisma.task.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: true,
    });

    return { data: tasks, stats };
  }

  @Permission('hr.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const task = await scopedPrisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: any,
    @Body() body: {
      title: string;
      description?: string;
      priority?: string;
      status?: string;
      assignedToId?: string;
      assignedToName?: string;
      farmId?: string;
      dueDate?: string;
    },
  ) {
    const orgId = getOrgId(req);
    const user = (req as any).user;

    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = body;
    if (!title) throw new BadRequestException('Title is required');

    return scopedPrisma.task.create({
      data: {
        organizationId: orgId,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        status: status || 'PENDING',
        assignedToId: assignedToId || null,
        assignedToName: assignedToName || null,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
        farmId: farmId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
  }

  @Permission('hr.write')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: {
      title?: string;
      description?: string;
      priority?: string;
      status?: string;
      assignedToId?: string;
      assignedToName?: string;
      farmId?: string;
      dueDate?: string;
    },
  ) {
    const user = (req as any).user;
    const existing = await scopedPrisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    if (!getUserPermissions(req).includes('hr.write')) {
      if (existing.assignedToId !== user?.sub) {
        throw new ForbiddenException('Cannot update tasks not assigned to you');
      }
      const { status } = body;
      if (!status) throw new BadRequestException('Status is required');
      return scopedPrisma.task.update({
        where: { id },
        data: {
          status,
          ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
        },
      });
    }

    const { title, description, priority, status, assignedToId, assignedToName, farmId, dueDate } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') updateData.completedAt = new Date();
      else updateData.completedAt = null;
    }
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (assignedToName !== undefined) updateData.assignedToName = assignedToName || null;
    if (farmId !== undefined) updateData.farmId = farmId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    return scopedPrisma.task.update({ where: { id }, data: updateData });
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const existing = await scopedPrisma.task.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');
    await scopedPrisma.task.delete({ where: { id } });
  }

  @Permission('hr.write')
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    const { status } = body;
    if (!status) throw new BadRequestException('Status is required');

    return scopedPrisma.task.update({
      where: { id },
      data: {
        status,
        ...(status === 'COMPLETED' ? { completedAt: new Date() } : { completedAt: null }),
      },
    });
  }
}
