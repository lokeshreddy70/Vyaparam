import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

// Rooms are keyed by businessId so kitchen displays only see orders
// belonging to their own tenant.
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/kitchen' })
export class KitchenGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join-business')
  handleJoin(@MessageBody() businessId: string, @ConnectedSocket() client: Socket) {
    client.join(businessId);
    return { joined: businessId };
  }

  emitNewKot(businessId: string, payload: unknown) {
    this.server.to(businessId).emit('kot:new', payload);
  }

  emitKotStatusChange(businessId: string, payload: unknown) {
    this.server.to(businessId).emit('kot:status', payload);
  }
}
