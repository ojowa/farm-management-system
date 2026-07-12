import { DeviceToken } from '../entities/device-token.entity';

export interface DeviceTokenRepository {
  findById(id: string): Promise<DeviceToken | null>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByToken(token: string): Promise<DeviceToken | null>;
  findActiveByUserId(userId: string): Promise<DeviceToken[]>;
  save(entity: DeviceToken): Promise<void>;
  delete(id: string): Promise<void>;
  deactivateByToken(token: string): Promise<void>;
}
