import { BaseEntity, Id } from '@farm/domain-core';

interface CorrespondenceProps {
  organizationId: Id;
  referenceNumber: string;
  title: string;
  type: string;
  category: string;
  from: string;
  to: string;
  content: string;
  status: string;
  priority: string;
  receivedDate: Date;
  createdById: Id;
  createdByName: string;
  archivedAt?: Date;
}

export class Correspondence extends BaseEntity<CorrespondenceProps> {
  private constructor(id: Id, props: CorrespondenceProps) {
    super(id, props);
  }

  get organizationId(): Id {
    return this.props.organizationId;
  }

  get referenceNumber(): string {
    return this.props.referenceNumber;
  }

  get title(): string {
    return this.props.title;
  }

  get type(): string {
    return this.props.type;
  }

  get category(): string {
    return this.props.category;
  }

  get from(): string {
    return this.props.from;
  }

  get to(): string {
    return this.props.to;
  }

  get content(): string {
    return this.props.content;
  }

  get status(): string {
    return this.props.status;
  }

  get priority(): string {
    return this.props.priority;
  }

  get receivedDate(): Date {
    return this.props.receivedDate;
  }

  get createdById(): Id {
    return this.props.createdById;
  }

  get createdByName(): string {
    return this.props.createdByName;
  }

  get archivedAt(): Date | undefined {
    return this.props.archivedAt;
  }

  static create(
    id: Id,
    organizationId: Id,
    referenceNumber: string,
    title: string,
    type: string,
    category: string,
    from: string,
    to: string,
    content: string,
    status: string,
    priority: string,
    receivedDate: Date,
    createdById: Id,
    createdByName: string,
  ): Correspondence {
    return new Correspondence(id, {
      organizationId,
      referenceNumber,
      title,
      type,
      category,
      from,
      to,
      content,
      status,
      priority,
      receivedDate,
      createdById,
      createdByName,
    });
  }

  archive(): void {
    this.props.archivedAt = new Date();
  }

  unarchive(): void {
    this.props.archivedAt = undefined;
  }
}
