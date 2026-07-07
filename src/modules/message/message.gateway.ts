// message.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})

export class MessageGateway {

  @WebSocketServer()
  server!: Server;

  // 🔥 user rejoint sa room
  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: number,
  ) {

    // room user-1 user-2 ...
    client.join(`user-${userId}`);

  }

  // 🔥 envoyer message temps réel
  sendMessage(message: any) {

    // 🔵 envoyer au receiver
    this.server
      .to(`user-${message.receiverId}`)
      .emit('newMessage', message);

    // 🟢 envoyer aussi au sender
    this.server
      .to(`user-${message.senderId}`)
      .emit('newMessage', message);
  }
}