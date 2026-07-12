export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
  ORGANIZATION_OWNER = 'ORGANIZATION_OWNER',
  FARM_MANAGER = 'FARM_MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  WORKER = 'WORKER',
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 100,
  [UserRole.SUPPORT_ADMIN]: 90,
  [UserRole.ORGANIZATION_OWNER]: 80,
  [UserRole.FARM_MANAGER]: 60,
  [UserRole.SUPERVISOR]: 40,
  [UserRole.WORKER]: 20,
};

export class UserRoleValue {
  private readonly value: UserRole;

  private constructor(value: UserRole) {
    this.value = value;
  }

  static create(value: UserRole): UserRoleValue {
    if (!Object.values(UserRole).includes(value)) {
      throw new Error(`Invalid user role: ${value}`);
    }
    return new UserRoleValue(value);
  }

  static fromString(value: string): UserRoleValue {
    const role = value.toUpperCase() as UserRole;
    return UserRoleValue.create(role);
  }

  get name(): UserRole {
    return this.value;
  }

  get level(): number {
    return ROLE_HIERARCHY[this.value];
  }

  isHigherThan(other: UserRoleValue): boolean {
    return this.level > other.level;
  }

  isLowerThan(other: UserRoleValue): boolean {
    return this.level < other.level;
  }

  equals(other: UserRoleValue): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): UserRole {
    return this.value;
  }
}
