import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyServiceToken } from '../../kernel/auth';
import { RealtimeGateway } from './realtime.gateway';

/** Internal relay events are notification-only for now; widen deliberately. */
const ALLOWED_EVENT_PREFIX = 'notification:';

/**
 * Internal, service-to-service emit endpoint.
 *
 * Services that run in a different process from the API gateway (the
 * notification service, locally and on Render) push user-room events here so
 * they reach the socket.io connections clients actually hold. Authenticated
 * with the gateway-signed `x-service-token` (SERVICE_SECRET) instead of a
 * user JWT — a user-facing broadcast endpoint would let any caller spoof
 * another user's inbox.
 *
 * Not exposed through the proxy: `realtime/*` has no service route, so the
 * gateway falls through to this controller, and AuthMiddleware lets the
 * request past only with a valid service token.
 */
@Controller('realtime')
export class RealtimeInternalController {
  private readonly logger = new Logger(RealtimeInternalController.name);

  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  @Post('emit-internal')
  emitInternal(
    @Body() body: { userId?: unknown; event?: unknown; data?: unknown },
    @Headers('x-service-token') serviceToken?: string
  ): { success: boolean } {
    if (!serviceToken) {
      throw new UnauthorizedException('Service token required');
    }
    try {
      verifyServiceToken(String(serviceToken));
    } catch {
      throw new UnauthorizedException('Invalid service token');
    }

    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const event = typeof body?.event === 'string' ? body.event.trim() : '';
    if (!userId) {
      throw new UnauthorizedException('userId is required');
    }
    if (!event.startsWith(ALLOWED_EVENT_PREFIX)) {
      throw new UnauthorizedException(`Event "${event}" is not allowed on the internal relay`);
    }

    this.logger.log(`Relaying "${event}" to user ${userId}`);
    this.realtimeGateway.sendToUser(userId, event, body?.data ?? null);
    return { success: true };
  }
}
