import { Router, Request, Response } from 'express';
import { scopedPrisma } from '@farm/database';

const router = Router();
const prisma = scopedPrisma as any;

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

// ── Buyers ──────────────────────────────────────────────

// GET /marketplace/buyers - List buyers
router.get('/buyers', async (req: Request, res: Response) => {
  try {
    const buyers = await prisma.buyer.findMany({
      where: { organizationId: getOrgId(req) },
      orderBy: { name: 'asc' },
    });
    res.json(buyers);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /marketplace/buyers - Create buyer
router.post('/buyers', async (req: Request, res: Response) => {
  try {
    const { name, contactPerson, email, phone, address, type, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const buyer = await prisma.buyer.create({
      data: {
        organizationId: getOrgId(req), name,
        contactPerson: contactPerson || null, email: email || null,
        phone: phone || null, address: address || null,
        type: type || 'INDIVIDUAL', notes: notes?.trim() || null,
      },
    });
    res.status(201).json(buyer);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /marketplace/buyers/:id
router.put('/buyers/:id', async (req: Request, res: Response) => {
  try {
    const { name, contactPerson, email, phone, address, type, notes } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (type !== undefined) updateData.type = type;
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    const buyer = await prisma.buyer.update({ where: { id: req.params.id }, data: updateData });
    res.json(buyer);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /marketplace/buyers/:id
router.delete('/buyers/:id', async (req: Request, res: Response) => {
  try {
    await prisma.buyer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// ── Listings ────────────────────────────────────────────

// GET /marketplace/listings - List marketplace listings
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const { status, entityType } = req.query;
    const where: any = { organizationId: getOrgId(req) };
    if (status) where.status = String(status);
    if (entityType) where.entityType = String(entityType);
    const listings = await prisma.marketListing.findMany({
      where, include: { buyer: true }, orderBy: { listedDate: 'desc' },
    });
    res.json(listings);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// POST /marketplace/listings - Create listing
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const { buyerId, entityType, entityId, title, price, unit, quantity } = req.body;
    if (!title || !price || !quantity) return res.status(400).json({ error: 'title, price, and quantity are required' });
    const listing = await prisma.marketListing.create({
      data: {
        organizationId: getOrgId(req),
        buyerId: buyerId || null, entityType: entityType || null,
        entityId: entityId || null, title,
        price: Number(price), unit: unit || 'kg',
        quantity: Number(quantity), listedDate: new Date(),
      },
    });
    res.status(201).json(listing);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// PUT /marketplace/listings/:id - Update listing (mark as sold, etc.)
router.put('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { status, soldDate, price, quantity } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (soldDate !== undefined) updateData.soldDate = soldDate ? new Date(soldDate) : null;
    if (price !== undefined) updateData.price = Number(price);
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    const listing = await prisma.marketListing.update({ where: { id: req.params.id }, data: updateData });
    res.json(listing);
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

// DELETE /marketplace/listings/:id
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    await prisma.marketListing.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export const marketplaceRouter = router;
