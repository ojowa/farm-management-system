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
} from '@nestjs/common';
import { Request } from 'express';
import { scopedPrisma } from '@farm/database';

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserId(req: Request): string {
  return String((req as any)['x-user-id'] || (req as any).user?.id || '');
}

function getUserName(req: Request): string {
  const user = (req as any).user;
  return user?.fullName || 'User';
}

async function generateRefNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await scopedPrisma.correspondence.count({
    where: { organizationId: orgId, referenceNumber: { startsWith: `COR-${year}-` } },
  });
  return `COR-${year}-${String(count + 1).padStart(3, '0')}`;
}

@Controller('correspondence')
export class CorrespondenceController {
  @Get()
  async findAll(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('archived') archived?: string,
  ) {
    const orgId = getOrgId(req);

    const where: any = { organizationId: orgId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (category) where.category = category;
    if (archived === 'true') {
      where.archivedAt = { not: null };
    } else if (archived === 'false') {
      where.archivedAt = null;
    }

    return scopedPrisma.correspondence.findMany({
      where,
      include: { attachments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('stats')
  async stats(@Req() req: Request) {
    const orgId = getOrgId(req);
    const [total, draft, sent, received, archived] = await Promise.all([
      scopedPrisma.correspondence.count({ where: { organizationId: orgId } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, status: 'DRAFT' } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, status: 'SENT' } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, status: 'RECEIVED' } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, archivedAt: { not: null } } }),
    ]);
    return { total, draft, sent, received, archived };
  }

  @Get('attachments/:id')
  async findAttachment(@Param('id') id: string) {
    const existing = await scopedPrisma.correspondenceAttachment.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Attachment not found');
    return existing;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const item = await scopedPrisma.correspondence.findFirst({
      where: { id },
      include: { attachments: true },
    });
    if (!item) throw new NotFoundException('Correspondence not found');
    return item;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request,
    @Body() body: {
      title: string;
      type: string;
      category?: string;
      from?: string;
      to?: string;
      content?: string;
      status?: string;
      priority?: string;
      receivedDate?: string;
    },
  ) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const userName = getUserName(req);
    const { title, type, category, from, to, content, status, priority, receivedDate } = body;

    if (!title?.trim()) throw new BadRequestException('Title is required');
    if (!type) throw new BadRequestException('Type is required (INCOMING, OUTGOING, INTERNAL)');

    const referenceNumber = await generateRefNumber(orgId);

    return scopedPrisma.correspondence.create({
      data: {
        organizationId: orgId,
        referenceNumber,
        title: title.trim(),
        type,
        category: category || 'OTHER',
        from: from || null,
        to: to || null,
        content: content || null,
        status: status || 'DRAFT',
        priority: priority || 'NORMAL',
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        createdById: userId,
        createdByName: userName,
      },
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: {
      title?: string;
      type?: string;
      category?: string;
      from?: string;
      to?: string;
      content?: string;
      status?: string;
      priority?: string;
      receivedDate?: string;
    },
  ) {
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Correspondence not found');

    const { title, type, category, from, to, content, status, priority, receivedDate } = body;
    return scopedPrisma.correspondence.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(type !== undefined && { type }),
        ...(category !== undefined && { category }),
        ...(from !== undefined && { from }),
        ...(to !== undefined && { to }),
        ...(content !== undefined && { content }),
        ...(status !== undefined && { status }),
        ...(priority !== undefined && { priority }),
        ...(receivedDate !== undefined && { receivedDate: receivedDate ? new Date(receivedDate) : null }),
      },
    });
  }

  @Put(':id/archive')
  async archive(@Param('id') id: string) {
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Correspondence not found');

    return scopedPrisma.correspondence.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  @Put(':id/unarchive')
  async unarchive(@Param('id') id: string) {
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Correspondence not found');

    return scopedPrisma.correspondence.update({
      where: { id },
      data: { archivedAt: null, status: 'RECEIVED' },
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Correspondence not found');
    await scopedPrisma.correspondence.delete({ where: { id } });
  }

  @Post(':id/attachments')
  @HttpCode(HttpStatus.CREATED)
  async addAttachment(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() body: { fileName: string; fileSize?: number; fileUrl: string; fileType?: string },
  ) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Correspondence not found');

    const { fileName, fileSize, fileUrl, fileType } = body;
    if (!fileName || !fileUrl) throw new BadRequestException('fileName and fileUrl are required');

    return scopedPrisma.correspondenceAttachment.create({
      data: {
        correspondenceId: id,
        fileName,
        fileSize: fileSize || 0,
        fileUrl,
        fileType: fileType || null,
        uploadedById: userId,
        organizationId: orgId,
      },
    });
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttachment(@Param('id') id: string) {
    const existing = await scopedPrisma.correspondenceAttachment.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Attachment not found');
    await scopedPrisma.correspondenceAttachment.delete({ where: { id } });
  }
}
