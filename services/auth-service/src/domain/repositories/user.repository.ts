export interface UserRepository {
  findById(id: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  findByPhone(phone: string): Promise<any | null>;
  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    roleId: string;
    organizationId?: string;
  }): Promise<any>;
  update(id: string, data: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret: string;
  }>): Promise<any>;
  delete(id: string): Promise<void>;
}
