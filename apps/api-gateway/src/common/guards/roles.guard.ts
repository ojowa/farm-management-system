import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * @deprecated No-op guard. Auth has been removed.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true;
  }
}
