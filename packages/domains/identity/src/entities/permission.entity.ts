import { BaseEntity, Id } from '@farm/domain-core';

export interface PermissionProps {
  name: string;
  description: string;
  category: string;
}

export class Permission extends BaseEntity<PermissionProps> {
  private constructor(id: Id, props: PermissionProps) {
    super(id, props);
  }

  static create(id: Id, props: PermissionProps): Permission {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Permission name is required');
    }
    if (!props.description || props.description.trim().length === 0) {
      throw new Error('Permission description is required');
    }
    if (!props.category || props.category.trim().length === 0) {
      throw new Error('Permission category is required');
    }
    return new Permission(id, {
      name: props.name.trim(),
      description: props.description.trim(),
      category: props.category.trim(),
    });
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get category(): string {
    return this.props.category;
  }
}
