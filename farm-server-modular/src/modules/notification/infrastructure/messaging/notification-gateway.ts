import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { verifyAccessToken, signServiceToken } from '../../../../kernel/auth';

function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return ['http://localhost:3000'];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

/**
 * Clients (admin web, mobile) connect to the *root* namespace of the API
 * gateway — not to `/notifications` — so a user room is only reachable from
 * whichever socket.io server those clients are attached to. Delivery order:
 *
 *   1. `global.__FMS_SOCKET_IO__` — Vercel runs the gateway and every domain
 *      module in one process, so the shared instance owns the live sockets.
 *   2. this gateway's own namespace server, when this process actually hosts
 *      it (single-process / monolith deployments).
 *   3. HTTP relay to the gateway (`POST /v1/realtime/emit-internal`, signed
 *      with SERVICE_SECRET) — the normal local/Render shape, where the
 *      notification service is a separate process from the gateway that owns
 *      the client connections.
 */
@WebSocketGateway({
  cors: {
    origin: parseCorsOrigins(),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket): void {
    // Same contract as RealtimeGateway: accept the token from handshake auth
    // or the accessToken cookie only — never from query params (they land in
    // access logs and browser history).
    let token = client.handshake.auth?.token;
    if (!token && client.handshake.headers?.cookie) {
      const cookies = parseCookies(client.handshake.headers.cookie);
      token = cookies.accessToken;
    }

    if (!token || typeof token !== 'string') {
      this.logger.warn(`Client rejected: no token (${client.id})`);
      client.disconnect();
      return;
    }

    try {
      const user = verifyAccessToken(token);
      (client as any).userId = user.id;
      (client as any).organizationId = user.organizationId ?? null;
      this.logger.log(`Client connected: ${client.id} (user: ${user.id})`);
    } catch {
      this.logger.warn(`Client rejected: invalid token (${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as any).userId as string | undefined;
    this.logger.log(`Client disconnected: ${client.id}${userId ? ` (user: ${userId})` : ''}`);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  @SubscribeMessage('join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ): { event: string; data: { success: boolean; userId: string } } {
    // Rooms are per-user inboxes: only the authenticated principal may join.
    const authenticatedUserId = (client as any).userId as string | undefined;
    const userId = data?.userId;
    if (!authenticatedUserId || userId !== authenticatedUserId) {
      this.logger.warn(
        `Unauthenticated room join attempt (${client.id} claimed ${userId})`
      );
      return { event: 'error', data: { success: false, userId: String(userId ?? '') } };
    }

    const roomName = `user:${userId}`;
    client.join(roomName);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`User ${userId} joined room ${roomName} (socket: ${client.id})`);
    return { event: 'joined', data: { success: true, userId } };
  }

  @SubscribeMessage('leave')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ): { event: string; data: { success: boolean; userId: string } } {
    const authenticatedUserId = (client as any).userId as string | undefined;
    const userId = data?.userId;
    if (!authenticatedUserId || userId !== authenticatedUserId) {
      return { event: 'error', data: { success: false, userId: String(userId ?? '') } };
    }

    const roomName = `user:${userId}`;
    client.leave(roomName);

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`User ${userId} left room ${roomName} (socket: ${client.id})`);
    return { event: 'left', data: { success: true, userId } };
  }

  sendToUser(userId: string, event: string, payload: unknown): void {
    if (!userId) return;
    const room = `user:${userId}`;

    const shared = (global as any).__FMS_SOCKET_IO__ as Server | undefined;
    if (shared) {
      shared.to(room).emit(event, payload);
      return;
    }

    if (this.server) {
      this.server.to(room).emit(event, payload);
    }

    this.relayToGateway(userId, event, payload).catch((error) => {
      this.logger.warn(`Relay of "${event}" to gateway failed: ${(error as Error).message}`);
    });
  }

  /**
   * Multi-process deployments: push the event to the API gateway, which owns
   * the socket.io connections clients are attached to. Authenticated with a
   * SERVICE_SECRET-signed service token — never a user JWT.
   */
  private async relayToGateway(userId: string, event: string, payload: unknown): Promise<void> {
    const base =
      process.env.REALTIME_GATEWAY_URL ||
      `http://localhost:${process.env.API_SERVICE_PORT || process.env.PORT || 4000}`;

    const serviceToken = signServiceToken({
      id: 'notification-service',
      email: null,
      role: 'SERVICE',
      permissions: [],
      organizationId: null,
    });

    const response = await fetch(`${base}/v1/realtime/emit-internal`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-service-token': serviceToken,
      },
      body: JSON.stringify({ userId, event, data: payload }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`gateway responded ${response.status}`);
    }
  }
}
