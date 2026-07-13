import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { type VerifiedUser } from '@farm/auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET environment variable is required'); })(),
    });
  }

  async validate(payload: any): Promise<VerifiedUser> {
    return {
      id: payload.sub,
      email: payload.email ?? null,
      role: payload.role,
      permissions: payload.permissions ?? [],
      organizationId: payload.organizationId,
    };
  }
}
