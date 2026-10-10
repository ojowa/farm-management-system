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
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
  Logger,
  NotFoundException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { existsSync, createReadStream, mkdirSync } from 'fs';
import { Response } from 'express';
import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth-server/nestjs';
import { prisma } from '@farm/database';
import {
  StorageService,
  StorageObjectNotFoundError,
  buildDocumentKey,
} from '../../../../shared/storage';

function getOrgId(req: any): string {
  return String(req.user?.organizationId || '');
}

// Legacy local-disk directory. New uploads go to the configured object store
// (see StorageService); this remains only to serve pre-existing local files.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? join('/tmp', 'uploads')
    : join(process.cwd(), 'uploads'));
try {
  mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {
  // Read-only filesystem (e.g. Vercel serverless): uploads are ephemeral.
}

const DOCUMENT_TYPE_BY_EXT: Record<string, string> = {
  '.png': 'IMAGE',
  '.jpg': 'IMAGE',
  '.jpeg': 'IMAGE',
  '.gif': 'IMAGE',
  '.webp': 'IMAGE',
  '.svg': 'IMAGE',
  '.pdf': 'PDF',
  '.csv': 'SPREADSHEET',
  '.xls': 'SPREADSHEET',
  '.xlsx': 'SPREADSHEET',
  '.doc': 'DOCUMENT',
  '.docx': 'DOCUMENT',
  '.txt': 'DOCUMENT',
  '.md': 'DOCUMENT',
};

function inferDocumentType(filename: string): string {
  const ext = extname(filename || '').toLowerCase();
  return DOCUMENT_TYPE_BY_EXT[ext] || 'OTHER';
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly storage: StorageService) {}

  @Permission('farm.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
  ) {
    const where: Record<string, unknown> = { organizationId: getOrgId(req) };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.document.count({ where }),
    ]);

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  @Permission('farm.write')
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES) || 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('A "file" field is required');

    const orgId = getOrgId(req);
    const name = (req.body?.name as string) || file.originalname;
    const id = randomUUID();
    const storageKey = buildDocumentKey(orgId, file.originalname);

    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    return prisma.document.create({
      data: {
        id,
        organizationId: orgId,
        name,
        type: (req.body?.type as string) || inferDocumentType(file.originalname),
        entityId: req.body?.entityId || null,
        entityType: req.body?.entityType || null,
        uploadedById: req.user?.sub || null,
        uploadedByName: req.user?.email || null,
        fileSize: file.size ?? null,
        mimeType: file.mimetype || null,
        storageKey,
        storageDriver: await this.storage.getDriver(),
        url: `/v1/documents/${id}/content`,
      },
    });
  }

  @Permission('farm.read')
  @Get('content/:filename')
  async download(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[/\\]/g, '');
    const filePath = join(UPLOAD_DIR, safe);
    if (!existsSync(filePath)) throw new NotFoundException('File not found');
    res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
    return createReadStream(filePath).pipe(res);
  }

  @Permission('farm.read')
  @Get(':id/content')
  async downloadById(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc || doc.organizationId !== getOrgId(req)) {
      throw new NotFoundException('Document not found');
    }
    if (!doc.storageKey) throw new NotFoundException('File content unavailable');

    let object;
    try {
      object = await this.storage.download(doc.storageKey);
    } catch (err) {
      if (err instanceof StorageObjectNotFoundError) {
        throw new NotFoundException('File content unavailable');
      }
      throw err;
    }

    res.setHeader('Content-Type', doc.mimeType || object.contentType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.name || 'download')}"`,
    );
    if (object.contentLength) res.setHeader('Content-Length', String(object.contentLength));
    return object.stream.pipe(res);
  }

  @Permission('farm.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return prisma.document.findUnique({ where: { id } });
  }

  @Permission('farm.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return prisma.document.create({
      data: {
        organizationId: getOrgId(req),
        name: body.name,
        type: body.type || 'OTHER',
        entityId: body.entityId || null,
        entityType: body.entityType || null,
        uploadedById: req.user?.sub || null,
        uploadedByName: req.user?.email || null,
        fileSize: body.fileSize || null,
        mimeType: body.mimeType || null,
        url: body.url,
      },
    });
  }

  @Permission('farm.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return prisma.document.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        entityId: body.entityId,
        entityType: body.entityType,
      },
    });
  }

  @Permission('farm.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (doc?.storageKey) {
      await this.storage.delete(doc.storageKey).catch((err) => {
        // Don't block metadata deletion if the object is already gone.
        this.logger.warn(`Failed to delete storage object ${doc.storageKey}: ${err?.message}`);
      });
    }
    await prisma.document.delete({ where: { id } });
    return { deleted: true };
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('inventory')
export class InventoryController {
  @Permission('farm.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const where: Record<string, unknown> = { organizationId: getOrgId(req) };
    if (farmId) where.farmId = farmId;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.inventory.count({ where }),
    ]);

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  @Permission('farm.read')
  @Get('low-stock')
  async findLowStock(@Req() req: any) {
    const orgId = getOrgId(req);
    return prisma.inventory.findMany({
      where: {
        organizationId: orgId,
        quantity: { lte: prisma.inventory.fields.minimumQuantity },
      },
      orderBy: { quantity: 'asc' },
    });
  }

  @Permission('farm.read')
  @Get('equipment')
  async findEquipment(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const where: Record<string, unknown> = { organizationId: getOrgId(req) };
    if (farmId) where.farmId = farmId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.equipment.count({ where }),
    ]);

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  @Permission('farm.read')
  @Get('export')
  async exportInventory(
    @Req() req: any,
    @Query('format') format?: string,
  ) {
    const data = await prisma.inventory.findMany({
      where: { organizationId: getOrgId(req) },
      orderBy: { name: 'asc' },
    });
    return { format: format || 'json', data };
  }

  @Permission('farm.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return prisma.inventory.findUnique({ where: { id } });
  }

  @Permission('farm.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return prisma.inventory.create({
      data: {
        organizationId: getOrgId(req),
        farmId: body.farmId,
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        unit: body.unit,
        minimumQuantity: body.minimumQuantity || 0,
      },
    });
  }

  @Permission('farm.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return prisma.inventory.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        unit: body.unit,
        minimumQuantity: body.minimumQuantity,
      },
    });
  }

  @Permission('farm.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await prisma.inventory.delete({ where: { id } });
    return { deleted: true };
  }

  @Permission('farm.write')
  @Post('import')
  @HttpCode(HttpStatus.CREATED)
  async importInventory(@Req() req: any, @Body() body: { data: any[] }) {
    const orgId = getOrgId(req);
    const results = await Promise.all(
      body.data.map((item) =>
        prisma.inventory.create({
          data: {
            organizationId: orgId,
            farmId: item.farmId,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            unit: item.unit,
            minimumQuantity: item.minimumQuantity || 0,
          },
        })
      )
    );
    return { imported: results.length };
  }
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('equipment')
export class EquipmentController {
  @Permission('farm.read')
  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('farmId') farmId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const where: Record<string, unknown> = { organizationId: getOrgId(req) };
    if (farmId) where.farmId = farmId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page || '1');
    const limitNum = parseInt(limit || '20');
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      prisma.equipment.findMany({
        where,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
        skip,
        take: limitNum,
        include: { maintenanceRecords: true },
      }),
      prisma.equipment.count({ where }),
    ]);

    return { data, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  @Permission('farm.read')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return prisma.equipment.findUnique({
      where: { id },
      include: { maintenanceRecords: true },
    });
  }

  @Permission('farm.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() body: any) {
    return prisma.equipment.create({
      data: {
        organizationId: getOrgId(req),
        farmId: body.farmId || null,
        name: body.name,
        type: body.type,
        model: body.model || null,
        serialNumber: body.serialNumber || null,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        purchaseCost: body.purchaseCost || null,
        status: body.status || 'ACTIVE',
        notes: body.notes || null,
      },
    });
  }

  @Permission('farm.write')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.model !== undefined) data.model = body.model;
    if (body.serialNumber !== undefined) data.serialNumber = body.serialNumber;
    if (body.purchaseDate !== undefined) data.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    if (body.purchaseCost !== undefined) data.purchaseCost = body.purchaseCost;
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.lastMaintenance !== undefined) data.lastMaintenance = body.lastMaintenance ? new Date(body.lastMaintenance) : null;
    if (body.nextMaintenance !== undefined) data.nextMaintenance = body.nextMaintenance ? new Date(body.nextMaintenance) : null;
    if (body.farmId !== undefined) data.farmId = body.farmId;
    return prisma.equipment.update({ where: { id }, data });
  }

  @Permission('farm.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    await prisma.equipment.delete({ where: { id } });
    return { deleted: true };
  }
}
