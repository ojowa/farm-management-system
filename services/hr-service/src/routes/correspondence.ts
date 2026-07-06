import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();

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

// GET /correspondence - List correspondence
router.get('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const { status, type, category, archived } = req.query;

    const where: any = { organizationId: orgId };
    if (status) where.status = String(status);
    if (type) where.type = String(type);
    if (category) where.category = String(category);
    if (archived === 'true') {
      where.archivedAt = { not: null };
    } else if (archived === 'false') {
      where.archivedAt = null;
    }

    const items = await scopedPrisma.correspondence.findMany({
      where,
      include: { attachments: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /correspondence/stats - Get counts by status
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const [total, draft, sent, received, archived] = await Promise.all([
      scopedPrisma.correspondence.count({ where: { organizationId: orgId } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, status: 'DRAFT' } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, status: 'SENT' } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, status: 'RECEIVED' } }),
      scopedPrisma.correspondence.count({ where: { organizationId: orgId, archivedAt: { not: null } } }),
    ]);
    res.json({ total, draft, sent, received, archived });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /correspondence/:id - Get single correspondence
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const item = await scopedPrisma.correspondence.findFirst({
      where: { id },
      include: { attachments: true },
    });
    if (!item) return res.status(404).json({ error: 'Correspondence not found' });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /correspondence - Create correspondence
router.post('/', async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const userName = getUserName(req);
    const { title, type, category, from, to, content, status, priority, receivedDate } = req.body;

    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
    if (!type) return res.status(400).json({ error: 'Type is required (INCOMING, OUTGOING, INTERNAL)' });

    const referenceNumber = await generateRefNumber(orgId);

    const item = await scopedPrisma.correspondence.create({
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
    res.status(201).json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /correspondence/:id - Update correspondence
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Correspondence not found' });

    const { title, type, category, from, to, content, status, priority, receivedDate } = req.body;
    const item = await scopedPrisma.correspondence.update({
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
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /correspondence/:id/archive - Archive correspondence
router.put('/:id/archive', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Correspondence not found' });

    const item = await scopedPrisma.correspondence.update({
      where: { id },
      data: { archivedAt: new Date(), status: 'ARCHIVED' },
    });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /correspondence/:id/unarchive - Unarchive correspondence
router.put('/:id/unarchive', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Correspondence not found' });

    const item = await scopedPrisma.correspondence.update({
      where: { id },
      data: { archivedAt: null, status: 'RECEIVED' },
    });
    res.json(item);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /correspondence/:id - Delete correspondence
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Correspondence not found' });
    await scopedPrisma.correspondence.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /correspondence/:id/attachments - Add attachment metadata
router.post('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const existing = await scopedPrisma.correspondence.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Correspondence not found' });

    const { fileName, fileSize, fileUrl, fileType } = req.body;
    if (!fileName || !fileUrl) return res.status(400).json({ error: 'fileName and fileUrl are required' });

    const attachment = await scopedPrisma.correspondenceAttachment.create({
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
    res.status(201).json(attachment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /correspondence/attachments/:id - Remove attachment
router.delete('/attachments/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await scopedPrisma.correspondenceAttachment.findFirst({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Attachment not found' });
    await scopedPrisma.correspondenceAttachment.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const correspondenceRouter = router;
