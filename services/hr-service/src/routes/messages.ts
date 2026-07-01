import { Router, Request, Response } from 'express';
import { authMiddleware } from '@farm/auth/express';
import { scopedPrisma } from '@farm/database';
import { createBulkNotifications } from '../lib/notificationClient';

const router = Router();

function getOrgId(req: Request): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserId(req: Request): string {
  return String((req as any)['x-user-id'] || (req as any).user?.id || '');
}

// GET /messages/inbox - Get messages received by current user
router.get('/inbox', authMiddleware({ permission: 'messaging.read' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);

    const recipients = await scopedPrisma.messageRecipient.findMany({
      where: { recipientId: userId, organizationId: orgId },
      include: { message: true },
      orderBy: { createdAt: 'desc' },
    });

    const messages = recipients.map((r: any) => ({
      ...r.message,
      recipientId: r.id,
      isRead: r.isRead,
      readAt: r.readAt,
    }));

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /messages/sent - Get messages sent by current user
router.get('/sent', authMiddleware({ permission: 'messaging.read' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);

    const messages = await scopedPrisma.message.findMany({
      where: { senderId: userId, organizationId: orgId },
      include: { recipients: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /messages/unread-count - Get unread message count
router.get('/unread-count', authMiddleware({ permission: 'messaging.read' }), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const orgId = getOrgId(req);

    const count = await scopedPrisma.messageRecipient.count({
      where: { recipientId: userId, organizationId: orgId, isRead: false },
    });

    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /messages/:id - Get single message
router.get('/:id', authMiddleware({ permission: 'messaging.read' }), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = getUserId(req);
    const orgId = getOrgId(req);

    const message = await scopedPrisma.message.findFirst({
      where: { id, organizationId: orgId },
      include: { recipients: true },
    });

    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Mark as read if recipient
    const recipient = await scopedPrisma.messageRecipient.findFirst({
      where: { messageId: id, recipientId: userId },
    });
    if (recipient && !recipient.isRead) {
      await scopedPrisma.messageRecipient.update({
        where: { id: recipient.id },
        data: { isRead: true, readAt: new Date() },
      });
    }

    res.json({ ...message, isRead: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /messages - Send a message
router.post('/', authMiddleware({ permission: 'messaging.write' }), async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const { subject, body, recipientIds, priority } = req.body;

    if (!subject || !body || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return res.status(400).json({ error: 'subject, body, and recipientIds are required' });
    }

    // Get sender info
    const sender = await scopedPrisma.user.findFirst({ where: { id: userId } });
    if (!sender) return res.status(404).json({ error: 'Sender not found' });
    const senderName = `${sender.firstName} ${sender.lastName}`;

    // Create message with recipients in transaction
    const message = await scopedPrisma.$transaction(async (tx: any) => {
      const msg = await tx.message.create({
        data: {
          organizationId: orgId,
          senderId: userId,
          senderName,
          subject: subject.trim(),
          body: body.trim(),
          priority: priority || 'NORMAL',
        },
      });

      // Resolve recipient names and create recipients
      const users = await tx.user.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, firstName: true, lastName: true },
      });

      await tx.messageRecipient.createMany({
        data: users.map((u: any) => ({
          messageId: msg.id,
          recipientId: u.id,
          recipientName: `${u.firstName} ${u.lastName}`,
          organizationId: orgId,
        })),
      });

      return msg;
    });

    // Create notifications for each recipient via notification-service (best-effort)
    try {
      const priorityLabel = priority === 'URGENT' ? '[URGENT] ' : priority === 'HIGH' ? '[HIGH] ' : '';
      await createBulkNotifications(
        recipientIds.map((recipientId: string) => ({
          userId: recipientId,
          title: `${priorityLabel}New message from ${senderName}`,
          message: subject.trim(),
          type: priority === 'URGENT' ? 'ALERT' : 'INFO',
          link: '/messages',
          entityType: 'Message',
          entityId: message.id,
        }))
      );
    } catch { /* notification creation is best-effort */ }

    res.status(201).json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /messages/:id - Delete message (sender or recipient)
router.delete('/:id', authMiddleware({ permission: 'messaging.write' }), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const userId = getUserId(req);
    const orgId = getOrgId(req);

    const message = await scopedPrisma.message.findFirst({ where: { id, organizationId: orgId } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    // Only sender can delete the message entirely
    if (message.senderId === userId) {
      await scopedPrisma.message.delete({ where: { id } });
    } else {
      // Recipient: delete their recipient record
      const recipient = await scopedPrisma.messageRecipient.findFirst({
        where: { messageId: id, recipientId: userId },
      });
      if (!recipient) return res.status(403).json({ error: 'Not authorized' });
      await scopedPrisma.messageRecipient.delete({ where: { id: recipient.id } });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export const messagesRouter = router;
