import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// GET /schedule - List scheduled reports
router.get('/', async (req: Request, res: Response) => {
  try {
    const records = await prisma.scheduledReport.findMany({
      where: { organizationId: getOrgId(req) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(records);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /schedule - Create scheduled report
router.post('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, template, recipients, frequency } = req.body;
    if (!name || !template || !frequency) return res.status(400).json({ error: 'name, template, and frequency are required' });

    const nextSend = calculateNextSend(frequency);

    const record = await prisma.scheduledReport.create({
      data: {
        organizationId: getOrgId(req),
        name, template,
        recipients: recipients || [],
        frequency,
        nextSend,
        createdById: user?.sub || null,
        createdByName: user?.email || null,
      },
    });
    res.status(201).json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /schedule/:id - Update scheduled report
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, template, recipients, frequency, isActive } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (template !== undefined) updateData.template = template;
    if (recipients !== undefined) updateData.recipients = recipients;
    if (frequency !== undefined) { updateData.frequency = frequency; updateData.nextSend = calculateNextSend(frequency); }
    if (isActive !== undefined) updateData.isActive = isActive;

    const record = await prisma.scheduledReport.update({ where: { id: req.params.id }, data: updateData });
    res.json(record);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /schedule/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.scheduledReport.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

function calculateNextSend(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'DAILY': now.setDate(now.getDate() + 1); break;
    case 'WEEKLY': now.setDate(now.getDate() + 7); break;
    case 'MONTHLY': now.setMonth(now.getMonth() + 1); break;
    case 'QUARTERLY': now.setMonth(now.getMonth() + 3); break;
  }
  return now;
}

export const scheduledReportsRouter = router;
