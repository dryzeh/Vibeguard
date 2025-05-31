import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { FastifyInstance } from 'fastify';
import { WebSocketClient, WebSocketService as IWebSocketService } from '../types/fastify.js';
import { wsRateLimit } from '../middleware/rateLimit.js';

/**
 * WebSocket service for real-time communication
 * @extends {EventEmitter}
 */
class WebSocketService extends EventEmitter implements IWebSocketService {
  private fastify: FastifyInstance;
  public clients: Map<string, WebSocketClient>;
  public subscriptions: Map<string, Set<string>>;
  private heartbeatInterval: NodeJS.Timeout | null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT = 10000; // 10 seconds

  constructor(fastify: FastifyInstance) {
    super();
    this.fastify = fastify;
    this.clients = new Map();
    this.subscriptions = new Map();
    this.heartbeatInterval = null;
    
    this.setupWebSocket();
    this.startHeartbeat();
  }
  
  private setupWebSocket(): void {
    this.fastify.get('/ws', { websocket: true }, (connection, req) => {
      const clientId = uuidv4();
      const clientIp = req.socket.remoteAddress || 'unknown';
      
      // Store client connection
      this.clients.set(clientId, {
        ws: connection.socket,
        ip: clientIp,
        lastHeartbeat: Date.now(),
        subscriptions: new Set(),
        metadata: {
          userAgent: req.headers['user-agent'] || 'unknown',
          connectedAt: new Date()
        }
      });
      
      // Log connection
      this.fastify.log.info({
        msg: 'WebSocket client connected',
        clientId,
        ip: clientIp
      });
      
      // Handle messages
      connection.socket.on('message', async (message: Buffer) => {
        try {
          // Apply rate limiting
          const mockRequest = {
            ip: clientIp,
            server: this.fastify
          } as any;
          const mockReply = {
            code: (code: number) => ({
              send: (data: any) => {
                if (code === 429) {
                  connection.socket.send(JSON.stringify({
                    type: 'error',
                    error: 'Rate limit exceeded',
                    retryAfter: data.retryAfter
                  }));
                  return true;
                }
                return false;
              }
            })
          } as any;

          await wsRateLimit(mockRequest, mockReply);

          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'SUBSCRIBE':
              this.handleSubscribe(clientId, data.events);
              break;
              
            case 'UNSUBSCRIBE':
              this.handleUnsubscribe(clientId, data.events);
              break;
              
            case 'PONG':
              this.handlePong(clientId);
              break;
              
            default:
              this.fastify.log.warn({
                msg: 'Unknown message type received',
                clientId,
                type: data.type
              });
          }
        } catch (error) {
          this.fastify.log.error({
            msg: 'Error processing WebSocket message',
            clientId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          connection.socket.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });
      
      // Handle client disconnect
      connection.socket.on('close', () => {
        this.handleDisconnect(clientId);
      });
      
      // Handle errors
      connection.socket.on('error', (error: Error) => {
        this.fastify.log.error({
          msg: 'WebSocket error',
          clientId,
          error: error.message
        });
        this.handleDisconnect(clientId);
      });
      
      // Send welcome message
      connection.socket.send(JSON.stringify({
        type: 'connected',
        id: clientId,
        message: 'Connected to VibeGuard WebSocket service'
      }));
    });
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (now - client.lastHeartbeat > this.HEARTBEAT_TIMEOUT) {
          this.fastify.log.warn({
            msg: 'Client heartbeat timeout',
            clientId,
            lastHeartbeat: client.lastHeartbeat
          });
          this.handleDisconnect(clientId);
          return;
        }
        
        // Send heartbeat
        this.sendToClient(clientId, { type: 'PING' });
      });
    }, this.HEARTBEAT_INTERVAL);
  }
  
  public handleSubscribe(clientId: string, events: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    events.forEach(event => {
      client.subscriptions.add(event);
      
      // Add to event subscriptions map
      if (!this.subscriptions.has(event)) {
        this.subscriptions.set(event, new Set());
      }
      this.subscriptions.get(event)?.add(clientId);
    });
    
    this.fastify.log.info({
      msg: 'Client subscribed to events',
      clientId,
      events
    });
    
    this.sendToClient(clientId, {
      type: 'subscribed',
      channels: Array.from(client.subscriptions)
    });
  }
  
  public handleUnsubscribe(clientId: string, events: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    events.forEach(event => {
      client.subscriptions.delete(event);
      this.subscriptions.get(event)?.delete(clientId);
    });
    
    this.fastify.log.info({
      msg: 'Client unsubscribed from events',
      clientId,
      events
    });
    
    this.sendToClient(clientId, {
      type: 'unsubscribed',
      channels: Array.from(client.subscriptions)
    });
  }
  
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.lastHeartbeat = Date.now();
    
    this.sendToClient(clientId, { type: 'pong' });
  }
  
  public handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    // Close WebSocket connection
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.close();
    }
    
    // Remove client
    this.clients.delete(clientId);
    
    this.fastify.log.info({
      msg: 'WebSocket client disconnected',
      clientId,
      ip: client.ip,
      duration: Date.now() - new Date(client.metadata.connectedAt).getTime()
    });
    
    // Emit disconnect event
    this.emit('disconnect', { clientId, client });
  }
  
  public sendToClient(clientId: string, message: Record<string, unknown>): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      this.fastify.log.error({
        msg: 'Error sending message to client',
        clientId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.handleDisconnect(clientId);
    }
  }
  
  public broadcast(event: string, message: Record<string, unknown>): void {
    const subscribers = this.subscriptions.get(event);
    if (!subscribers) return;
    
    subscribers.forEach(clientId => {
      this.sendToClient(clientId, { type: event, ...message });
    });
  }
  
  public cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach((client, clientId) => {
      this.handleDisconnect(clientId);
    });
  }

  // Add missing interface methods
  public handleConnection(ws: WebSocket, request: any): void {
    const clientId = uuidv4();
    const clientIp = request.socket.remoteAddress || 'unknown';
    
    // Store client connection
    this.clients.set(clientId, {
      ws,
      ip: clientIp,
      lastHeartbeat: Date.now(),
      subscriptions: new Set(),
      metadata: {
        userAgent: request.headers['user-agent'] || 'unknown',
        connectedAt: new Date()
      }
    });
    
    // Log connection
    this.fastify.log.info({
      msg: 'WebSocket client connected',
      clientId,
      ip: clientIp
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      id: clientId,
      message: 'Connected to VibeGuard WebSocket service'
    }));
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}

export default WebSocketService; 