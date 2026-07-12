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

export interface RealtimeEvent {
  entity: string;
  action: 'created' | 'updated' | 'deleted';
  data: any;
  timestamp?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private logger = new Logger(RealtimeGateway.name);
  private userSockets: Map<string, Set<string>> = new Map();

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.userSockets.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    });
  }

  @SubscribeMessage('join')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ): { event: string; data: { success: boolean; userId: string } } {
    const { userId } = data;
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
    const { userId } = data;
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

  broadcastRealtimeEvent(event: RealtimeEvent): void {
    if (!this.server) {
      this.logger.warn('Socket.IO server not initialized, cannot broadcast event');
      return;
    }

    const payload: RealtimeEvent = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    const entityEventName = `${payload.entity}.${payload.action}`;
    this.server.emit(entityEventName, payload);
    this.server.emit('realtime:event', payload);
    this.logger.log(`Broadcasted realtime event: ${entityEventName}`);
  }
}
