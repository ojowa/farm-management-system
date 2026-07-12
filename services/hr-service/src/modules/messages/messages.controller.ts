import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, AuthorizationGuard, Permission } from '@farm/auth';
import { scopedPrisma } from '@farm/database';
import { createBulkNotifications } from '../../lib/notificationClient';

function getOrgId(req: any): string {
  return String((req as any)['x-organization-id'] || (req as any).user?.organizationId || '');
}

function getUserId(req: any): string {
  return String((req as any)['x-user-id'] || (req as any).user?.id || '');
}

@UseGuards(JwtAuthGuard, AuthorizationGuard)
@Controller('messages')
export class MessagesController {
  @Permission('hr.read')
  @Get('inbox')
  async inbox(@Req() req: any) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);

    const recipients = await scopedPrisma.messageRecipient.findMany({
      where: { recipientId: userId, organizationId: orgId },
      include: { message: true },
      orderBy: { createdAt: 'desc' },
    });

    return recipients.map((r: any) => ({
      ...r.message,
      recipientId: r.id,
      isRead: r.isRead,
      readAt: r.readAt,
    }));
  }

  @Permission('hr.read')
  @Get('sent')
  async sent(@Req() req: any) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);

    return scopedPrisma.message.findMany({
      where: { senderId: userId, organizationId: orgId },
      include: { recipients: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Permission('hr.read')
  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    const userId = getUserId(req);
    const orgId = getOrgId(req);

    const count = await scopedPrisma.messageRecipient.count({
      where: { recipientId: userId, organizationId: orgId, isRead: false },
    });

    return { count };
  }

  @Permission('hr.read')
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const userId = getUserId(req);
    const orgId = getOrgId(req);

    const message = await scopedPrisma.message.findFirst({
      where: { id, organizationId: orgId },
      include: { recipients: true },
    });

    if (!message) throw new NotFoundException('Message not found');

    const recipient = await scopedPrisma.messageRecipient.findFirst({
      where: { messageId: id, recipientId: userId },
    });
    if (recipient && !recipient.isRead) {
      await scopedPrisma.messageRecipient.update({
        where: { id: recipient.id },
        data: { isRead: true, readAt: new Date() },
      });
    }

    return { ...message, isRead: true };
  }

  @Permission('hr.write')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: any,
    @Body() body: { subject: string; body: string; recipientIds: string[]; priority?: string },
  ) {
    const orgId = getOrgId(req);
    const userId = getUserId(req);
    const { subject, body: messageBody, recipientIds, priority } = body;

    if (!subject || !messageBody || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      throw new BadRequestException('subject, body, and recipientIds are required');
    }

    const sender = await scopedPrisma.user.findFirst({ where: { id: userId } });
    if (!sender) throw new NotFoundException('Sender not found');
    const senderName = `${sender.firstName} ${sender.lastName}`;

    const message = await scopedPrisma.$transaction(async (tx: any) => {
      const msg = await tx.message.create({
        data: {
          organizationId: orgId,
          senderId: userId,
          senderName,
          subject: subject.trim(),
          body: messageBody.trim(),
          priority: priority || 'NORMAL',
        },
      });

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
    } catch {}

    return message;
  }

  @Permission('hr.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = getUserId(req);
    const orgId = getOrgId(req);

    const message = await scopedPrisma.message.findFirst({ where: { id, organizationId: orgId } });
    if (!message) throw new NotFoundException('Message not found');

    if (message.senderId === userId) {
      await scopedPrisma.message.delete({ where: { id } });
    } else {
      const recipient = await scopedPrisma.messageRecipient.findFirst({
        where: { messageId: id, recipientId: userId },
      });
      if (!recipient) throw new ForbiddenException('Not authorized');
      await scopedPrisma.messageRecipient.delete({ where: { id: recipient.id } });
    }
  }
}
