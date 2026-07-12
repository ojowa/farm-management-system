import { AggregateRoot, Id } from '@farm/domain-core';
import { NotificationType } from '../value-objects/notification-type.value-object';
import {
  NotificationCreated,
  NotificationRead,
  NotificationAllRead,
} from '../events/notification-events';

export interface NotificationProps {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  entityType?: string;
  entityId?: string;
  read: boolean;
  createdAt: Date;
}

export class Notification extends AggregateRoot<NotificationProps> {
  private constructor(id: Id, props: NotificationProps) {
    super(id, props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get title(): string {
    return this.props.title;
  }

  get message(): string {
    return this.props.message;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get link(): string | undefined {
    return this.props.link;
  }

  get entityType(): string | undefined {
    return this.props.entityType;
  }

  get entityId(): string | undefined {
    return this.props.entityId;
  }

  get read(): boolean {
    return this.props.read;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  static create(props: Omit<NotificationProps, 'read' | 'createdAt'>): Notification {
    const id = Id.create();
    const notification = new Notification(id, {
      ...props,
      read: false,
      createdAt: new Date(),
    });
    notification.addDomainEvent(
      new NotificationCreated(id.toString(), { ...props }),
    );
    return notification;
  }

  markAsRead(): void {
    this.props.read = true;
    this.addDomainEvent(
      new NotificationRead(this.id.toString(), { notificationId: this.id.toString() }),
    );
  }

  static markAllAsRead(notifications: Notification[]): void {
    for (const notification of notifications) {
      if (!notification.read) {
        notification.markAsRead();
      }
    }
    if (notifications.length > 0) {
      notifications[0].addDomainEvent(
        new NotificationAllRead(notifications[0].id.toString(), {
          userId: notifications[0].userId,
        }),
      );
    }
  }
}
