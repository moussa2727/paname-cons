// destination.gateway.ts
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
import { Destination } from '../schemas/destination.schema';

@WebSocketGateway({
  namespace: 'destinations',
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = ['https://panameconsulting.vercel.app', 'https://paname-consulting.vercel.app'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie', 'Authorization'],
  },
})
export class DestinationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DestinationGateway.name);
  private connectedClients: Map<string, { clientId: string; socketId: string }> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
    
    // Envoyer le nombre de clients connectés
    this.server.emit('clients-count', this.connectedClients.size);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
    
    // Supprimer le client de la map
    for (const [key, value] of this.connectedClients.entries()) {
      if (value.socketId === client.id) {
        this.connectedClients.delete(key);
        break;
      }
    }
    
    // Mettre à jour le compteur
    this.server.emit('clients-count', this.connectedClients.size);
  }

  @SubscribeMessage('join-destination-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() destinationId: string,
  ) {
    client.join(`destination-${destinationId}`);
    this.logger.log(`Client ${client.id} a rejoint la room destination-${destinationId}`);
    return { event: 'joined-room', room: `destination-${destinationId}` };
  }

  @SubscribeMessage('leave-destination-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() destinationId: string,
  ) {
    client.leave(`destination-${destinationId}`);
    this.logger.log(`Client ${client.id} a quitté la room destination-${destinationId}`);
    return { event: 'left-room', room: `destination-${destinationId}` };
  }

  /**
   * Émettre un événement quand une destination est créée
   */
  emitDestinationCreated(destination: Destination) {
    this.server.emit('destination-created', destination);
    this.logger.debug(`Émission destination-created: ${destination.country}`);
  }

  /**
   * Émettre un événement quand une destination est mise à jour
   */
  emitDestinationUpdated(destination: Destination) {
    this.server.emit('destination-updated', destination);
    // Émettre aussi dans la room spécifique
    this.server.to(`destination-${destination._id}`).emit('destination-updated', destination);
    this.logger.debug(`Émission destination-updated: ${destination.country}`);
  }

  /**
   * Émettre un événement quand une destination est supprimée
   */
  emitDestinationDeleted(destinationId: string) {
    this.server.emit('destination-deleted', destinationId);
    this.logger.debug(`Émission destination-deleted: ${destinationId}`);
  }

  /**
   * Émettre une notification pour les clients
   */
  emitNotification(message: string, type: 'info' | 'success' | 'error' = 'info') {
    this.server.emit('notification', { message, type, timestamp: new Date() });
  }
}