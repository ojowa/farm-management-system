import { AggregateRoot, Id, Email, Phone } from '@farm/domain-core';
import {
  UserRegistered,
  UserLogin,
  UserLogout,
  UserRoleChanged,
  UserOrgSwitched,
  User2faEnabled,
  User2faDisabled,
} from '../events/user-events';
import { UserRoleValue } from '../value-objects/user-role.value-object';

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
}

export interface UserProps {
  organizationId: string;
  firstName: string;
  lastName: string;
  email: Email;
  phone: Phone | null;
  passwordHash: string;
  roleId: string;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  notificationPreferences: NotificationPreferences;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(id: Id, props: UserProps) {
    super(id, props);
  }

  static create(
    id: Id,
    props: Omit<UserProps, 'isActive' | 'lastLoginAt' | 'twoFactorEnabled' | 'twoFactorSecret' | 'notificationPreferences'> & {
      isActive?: boolean;
      lastLoginAt?: Date | null;
      twoFactorEnabled?: boolean;
      twoFactorSecret?: string | null;
      notificationPreferences?: NotificationPreferences;
    }
  ): User {
    if (!props.firstName || props.firstName.trim().length === 0) {
      throw new Error('First name is required');
    }
    if (!props.lastName || props.lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }
    if (!props.passwordHash || props.passwordHash.trim().length === 0) {
      throw new Error('Password hash is required');
    }
    if (!props.organizationId || props.organizationId.trim().length === 0) {
      throw new Error('Organization ID is required');
    }
    if (!props.roleId || props.roleId.trim().length === 0) {
      throw new Error('Role ID is required');
    }

    const user = new User(id, {
      organizationId: props.organizationId,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      email: props.email,
      phone: props.phone ?? null,
      passwordHash: props.passwordHash,
      roleId: props.roleId,
      avatar: props.avatar ?? null,
      isActive: props.isActive ?? true,
      lastLoginAt: props.lastLoginAt ?? null,
      twoFactorEnabled: props.twoFactorEnabled ?? false,
      twoFactorSecret: props.twoFactorSecret ?? null,
      notificationPreferences: props.notificationPreferences ?? {
        email: true,
        push: true,
        sms: false,
      },
    });

    user.addDomainEvent(
      new UserRegistered(id.toString(), {
        email: props.email.toString(),
        organizationId: props.organizationId,
      })
    );

    return user;
  }

  static reconstitute(id: Id, props: UserProps): User {
    return new User(id, props);
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }

  get email(): Email {
    return this.props.email;
  }

  get phone(): Phone | null {
    return this.props.phone;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get avatar(): string | null {
    return this.props.avatar;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get lastLoginAt(): Date | null {
    return this.props.lastLoginAt;
  }

  get twoFactorEnabled(): boolean {
    return this.props.twoFactorEnabled;
  }

  get twoFactorSecret(): string | null {
    return this.props.twoFactorSecret;
  }

  get notificationPreferences(): NotificationPreferences {
    return this.props.notificationPreferences;
  }

  recordLogin(): void {
    this.props.lastLoginAt = new Date();
    this.addDomainEvent(
      new UserLogin(this.id.toString(), {
        organizationId: this.props.organizationId,
      })
    );
  }

  recordLogout(): void {
    this.addDomainEvent(
      new UserLogout(this.id.toString(), {
        organizationId: this.props.organizationId,
      })
    );
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new Error('User is already deactivated');
    }
    this.props.isActive = false;
  }

  enable2fa(secret: string): void {
    if (this.props.twoFactorEnabled) {
      throw new Error('Two-factor authentication is already enabled');
    }
    if (!secret || secret.trim().length === 0) {
      throw new Error('Two-factor secret is required');
    }
    this.props.twoFactorEnabled = true;
    this.props.twoFactorSecret = secret;
    this.addDomainEvent(
      new User2faEnabled(this.id.toString(), { method: 'totp' })
    );
  }

  disable2fa(): void {
    if (!this.props.twoFactorEnabled) {
      throw new Error('Two-factor authentication is not enabled');
    }
    this.props.twoFactorEnabled = false;
    this.props.twoFactorSecret = null;
    this.addDomainEvent(
      new User2faDisabled(this.id.toString(), { reason: 'user_disabled' })
    );
  }

  changeRole(newRoleId: string, changedBy?: string): void {
    if (!newRoleId || newRoleId.trim().length === 0) {
      throw new Error('New role ID is required');
    }
    const previousRole = this.props.roleId;
    this.props.roleId = newRoleId;
    this.addDomainEvent(
      new UserRoleChanged(this.id.toString(), {
        previousRole,
        newRole: newRoleId,
        changedBy,
      })
    );
  }

  switchOrganization(newOrganizationId: string): void {
    if (!newOrganizationId || newOrganizationId.trim().length === 0) {
      throw new Error('New organization ID is required');
    }
    if (newOrganizationId === this.props.organizationId) {
      throw new Error('Cannot switch to the same organization');
    }
    const previousOrganizationId = this.props.organizationId;
    this.props.organizationId = newOrganizationId;
    this.addDomainEvent(
      new UserOrgSwitched(this.id.toString(), {
        previousOrganizationId,
        newOrganizationId,
      })
    );
  }

  updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: Phone | null;
    avatar?: string | null;
    notificationPreferences?: Partial<NotificationPreferences>;
  }): void {
    if (data.firstName !== undefined) {
      if (data.firstName.trim().length === 0) {
        throw new Error('First name cannot be empty');
      }
      this.props.firstName = data.firstName.trim();
    }
    if (data.lastName !== undefined) {
      if (data.lastName.trim().length === 0) {
        throw new Error('Last name cannot be empty');
      }
      this.props.lastName = data.lastName.trim();
    }
    if (data.phone !== undefined) {
      this.props.phone = data.phone;
    }
    if (data.avatar !== undefined) {
      this.props.avatar = data.avatar;
    }
    if (data.notificationPreferences !== undefined) {
      this.props.notificationPreferences = {
        ...this.props.notificationPreferences,
        ...data.notificationPreferences,
      };
    }
  }
}
