import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthorizationGuard } from '@farm/auth-server/nestjs';

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
