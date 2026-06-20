import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AuthResponse, LoginCredentials } from '@farm/types';

@Injectable()
export class AuthService {
  private readonly authServiceUrl = `http://localhost:${process.env.AUTH_SERVICE_PORT || 3002}/auth`;

  async login(data: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${this.authServiceUrl}/login`, data);
    return response.data;
  }

  async register(data: any): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${this.authServiceUrl}/register`, data);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${this.authServiceUrl}/refresh`, { refreshToken });
    return response.data;
  }
}
