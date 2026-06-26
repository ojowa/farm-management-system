import { User } from './user';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface JwtPayload {
  sub: string;
  email?: string | null;
  role: string;
  organizationId: string;
  iat?: number;
  exp?: number;
}
