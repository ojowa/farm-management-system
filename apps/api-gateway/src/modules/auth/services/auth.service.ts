import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AuthResponse, LoginCredentials } from '@farm/types';

@Injectable()
export class AuthService {
  private readonly authServiceUrl = `http://localhost:${process.env.AUTH_SERVICE_PORT || 4001}/auth`;

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

  async getProfile(user: any, authHeader?: string): Promise<any> {
    try {
      const response = await axios.get(`${this.authServiceUrl}/me`, {
        headers: {
          Authorization: authHeader || '',
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }

  async logout(user: any, authHeader?: string): Promise<any> {
    try {
      const response = await axios.post(`${this.authServiceUrl}/logout`, {}, {
        headers: { Authorization: authHeader || '' },
      });
      return response.data;
    } catch {
      return { message: 'Logged out' };
    }
  }

  async myOrganizations(user: any, authHeader?: string): Promise<any[]> {
    const response = await axios.get(`${this.authServiceUrl}/my-organizations`, {
      headers: { Authorization: authHeader || '' },
    });
    return response.data;
  }

  async switchOrganization(user: any, organizationId: string, authHeader?: string): Promise<any> {
    const response = await axios.post(`${this.authServiceUrl}/switch-organization`, { organizationId }, {
      headers: { Authorization: authHeader || '' },
    });
    return response.data;
  }
}
