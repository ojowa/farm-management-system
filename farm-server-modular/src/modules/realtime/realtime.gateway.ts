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
import { Logger, UnauthorizedException } from '@nestjs/common';
import { verifyAccessToken } from '../../kernel/auth';
import cookieParser from 'cookie-parser';

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

export interface RealtimeEvent {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp?: string;
}

@WebSocketGateway({
  cors: {
    origin: parseCorsOrigins(),
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger(RealtimeGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket): void {
    try {
      // Accept token from handshake auth only — query parameters are logged
      // in access logs and browser history, so we reject them for security.
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
      const user = verifyAccessToken(token);
      (client as any).userId = user.id;
      (client as any).userEmail = user.email;
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
    @MessageBody() data: { userId: string; organizationId?: string }
  ): { event: string; data: { success: boolean; userId: string } } {
    const authenticatedUserId = (client as any).userId as string;
    if (!authenticatedUserId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const { userId, organizationId } = data;
    if (userId !== authenticatedUserId) {
      this.logger.warn(`User ${authenticatedUserId} attempted to join room for ${userId}`);
      return { event: 'error', data: { success: false, userId } };
    }

    const roomName = `user:${userId}`;
    client.join(roomName);

    if (organizationId) {
      // An org room is a live feed of that tenant's events, so it must match
      // the organization on the caller's verified token — otherwise any
      // authenticated user could eavesdrop on any tenant.
      const clientOrg = (client as any).organizationId as string | null | undefined;
      if (!clientOrg || clientOrg !== organizationId) {
        this.logger.warn(`User ${authenticatedUserId} attempted to join foreign org room ${organizationId}`);
        return { event: 'error', data: { success: false, userId } };
      }
      const orgRoom = `org:${organizationId}`;
      client.join(orgRoom);
    }

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
    const authenticatedUserId = (client as any).userId as string;
    const { userId } = data;
    if (userId !== authenticatedUserId) {
      return { event: 'error', data: { success: false, userId } };
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

  broadcastRealtimeEvent(event: RealtimeEvent, organizationId?: string): void {
    // On Vercel the domains app runs inside server.js, which owns the exposed
    // http server and therefore the live socket.io connections. Prefer that
    // shared instance so broadcasts reach clients; fall back to the gateway's
    // own server everywhere else (local/Render, where it binds a port).
    const shared = (global as any).__FMS_SOCKET_IO__ as Server | undefined;
    const io = shared || this.server;
    if (!io) {
      this.logger.warn('Socket.IO server not initialized, cannot broadcast event');
      return;
    }

    const payload: RealtimeEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    const entityEventName = `${payload.entity}.${payload.action}`;

    if (organizationId) {
      io.to(`org:${organizationId}`).emit(entityEventName, payload);
      io.to(`org:${organizationId}`).emit('realtime:event', payload);
    } else {
      io.emit(entityEventName, payload);
      io.emit('realtime:event', payload);
    }
    this.logger.log(`Broadcasted realtime event: ${entityEventName}`);
  }
}
