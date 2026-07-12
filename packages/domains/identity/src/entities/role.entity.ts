import { AggregateRoot, Id } from '@farm/domain-core';

export interface RoleProps {
  name: string;
  description: string;
  isSystem: boolean;
  organizationId: string | null;
}

export class Role extends AggregateRoot<RoleProps> {
  private constructor(id: Id, props: RoleProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<RoleProps, 'isSystem'> & { isSystem?: boolean }
  ): Role {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Role name is required');
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new Error('Role description is required');
    }
    return new Role(id, {
      name: props.name.trim(),
      description: props.description.trim(),
      isSystem: props.isSystem ?? false,
      organizationId: props.organizationId,
    });
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get isSystem(): boolean {
    return this.props.isSystem;
  }

  get organizationId(): string | null {
    return this.props.organizationId;
  }

  update(data: { name?: string; description?: string }): void {
    if (this.props.isSystem) {
      throw new Error('Cannot update a system role');
    }
    if (data.name !== undefined) {
      if (data.name.trim().length === 0) {
        throw new Error('Role name cannot be empty');
      }
      this.props.name = data.name.trim();
    }
    if (data.description !== undefined) {
      if (data.description.trim().length === 0) {
        throw new Error('Role description cannot be empty');
      }
      this.props.description = data.description.trim();
    }
  }

  canDelete(): boolean {
    return !this.props.isSystem;
  }
}
