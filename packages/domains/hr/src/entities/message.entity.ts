import { BaseEntity, Id } from '@farm/domain-core';

interface MessageProps {
  organizationId: Id;
  senderId: Id;
  senderName: string;
  subject: string;
  body: string;
  priority: string;
}

export class Message extends BaseEntity<MessageProps> {
  private constructor(id: Id, props: MessageProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get senderId(): Id {
    return this.props.senderId;
  }

  get senderName(): string {
    return this.props.senderName;
  }

  get subject(): string {
    return this.props.subject;
  }

  get body(): string {
    return this.props.body;
  }

  get priority(): string {
    return this.props.priority;
  }

  static create(
    id: Id,
    organizationId: Id,
    senderId: Id,
    senderName: string,
    subject: string,
    body: string,
    priority: string,
  ): Message {
    return new Message(id, { organizationId, senderId, senderName, subject, body, priority });
  }
}
