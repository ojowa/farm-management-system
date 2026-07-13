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
import { verifyAccessToken } from '@farm/auth';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:8081', 'http://localhost:8082'],
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
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token || typeof token !== 'string') {
        this.logger.warn(`Client rejected: no token (${client.id})`);
        client.disconnect();
        return;
      }
      const user = verifyAccessToken(token);
      (client as any).userId = user.id;
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
    const authenticatedUserId = (client as any).userId as string;
    if (!authenticatedUserId) {
      return { event: 'error', data: { success: false, userId: data.userId } };
    }

    const { userId } = data;
    if (userId !== authenticatedUserId) {
      this.logger.warn(`User ${authenticatedUserId} attempted to join room for ${userId}`);
      return { event: 'error', data: { success: false, userId } };
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

  sendToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      return;
    }
    this.server.to(`user:${userId}`).emit(event, payload);
  }
}
