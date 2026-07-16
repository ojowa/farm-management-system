import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from '@farm/auth/nestjs';

/**
 * API Gateway guard that delegates to the AuthorizationGuard from @farm/auth.
 * This replaces the previous no-op guard with real DB-driven RBAC.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private authorizationGuard;

  constructor(private readonly reflector: Reflector) {
    this.authorizationGuard = new AuthorizationGuard(reflector);
  }

  canActivate(context: ExecutionContext): boolean {
    return this.authorizationGuard.canActivate(context);
  }
}
