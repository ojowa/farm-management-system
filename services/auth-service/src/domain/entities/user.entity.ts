export interface User {
  id: string;
  organizationId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string | undefined;
  passwordHash: string;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  notificationPreferences: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}
