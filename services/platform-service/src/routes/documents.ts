import { Router, type Request, type Response } from 'express';
import { scopedPrisma } from '@farm/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

type UploadRequest = Request & { file?: Express.Multer.File };

const router = Router();
const prisma = scopedPrisma as any;

// Configure multer for file uploads
const uploadDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => cb(null, uploadDir),
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /documents - List documents
router.get('/', async (req: Request, res: Response) => {
  try {
    const { entityId, entityType } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (entityId) where.entityId = String(entityId);
    if (entityType) where.entityType = String(entityType);
    const docs = await prisma.document.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(docs);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /documents/upload - Upload a file
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const uploadReq = req as UploadRequest;
    const file = uploadReq.file;
    if (!file) return res.status(400).json({ error: 'No file provided' });

    const { entityId, entityType } = req.body as Record<string, unknown>;
    const docType = getFileType(file.mimetype);

    const doc = await prisma.document.create({
      data: {
        organizationId: getOrgId(req),
        name: file.originalname,
        type: docType,
        entityId: entityId || null,
        entityType: entityType || null,
        uploadedById: user?.sub || null,
        uploadedByName: user?.email || null,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: `/uploads/${file.filename}`,
      },
    });
    res.status(201).json(doc);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /documents/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    // Delete file from disk
    const filePath = path.join(uploadDir, path.basename(doc.url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.document.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'SPREADSHEET';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'DOCUMENT';
  return 'OTHER';
}

export const documentsRouter = router;
