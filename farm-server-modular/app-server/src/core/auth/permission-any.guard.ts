import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PERMISSION_ANY_KEY = 'permissionAny';

/**
 * Alternative to `@Permission` from the kernel auth package, which accepts a
 * single string. Use this when a route legitimately serves several audiences —
 * for example `/messages`, which managers reach with `hr.*` and workers on the
 * mobile app reach with `communication.*`:
 *
 *   @PermissionAny('hr.read', 'communication.read')
 *   @Get('inbox')
 *
 * Access is granted when the caller holds ANY of the listed permissions
 * (honouring the same wildcard rules as the shared guard: `*` and `prefix.*`).
 */
export const PermissionAny = (...permissions: string[]) =>
  SetMetadata(PERMISSION_ANY_KEY, permissions);

function matches(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  if (granted.endsWith('.*')) {
    const prefix = granted.slice(0, -2);
    return required === prefix || required.startsWith(`${prefix}.`);
  }
  return false;
}

@Injectable()
export class PermissionAnyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSION_ANY_KEY,
      [context.getHandler(), context.getClass()],
    );
    // No metadata: the route doesn't restrict by permission (auth only).
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<any>();
    if (!user) throw new UnauthorizedException('Authentication required');

    const granted: string[] = user.permissions ?? [];
    if (required.some((p) => granted.some((g) => matches(g, p)))) {
      return true;
    }
    throw new ForbiddenException('Insufficient permission');
  }
}
