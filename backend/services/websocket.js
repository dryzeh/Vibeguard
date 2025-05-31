import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {Object} WebSocketClient
 * @property {WebSocket} ws - The WebSocket connection
 * @property {string} ip - The client's IP address
 * @property {number} lastHeartbeat - Timestamp of last heartbeat
 * @property {Set<string>} subscriptions - Set of subscribed events
 * @property {Object} metadata - Client metadata
 * @property {string} metadata.userAgent - Client's user agent
 * @property {Date} metadata.connectedAt - Connection timestamp
 */

/**
 * WebSocket service for real-time communication
 * @extends {EventEmitter}
 */
class WebSocketService extends EventEmitter {
  /**
   * @param {import('fastify').FastifyInstance} fastify - The Fastify instance
   */
  constructor(fastify) {
    super();
    this.fastify = fastify;
    /** @type {Map<string, WebSocketClient>} */
    this.clients = new Map(); // Map of client ID to WebSocket
    /** @type {Map<string, Set<string>>} */
    this.subscriptions = new Map(); // Map of client ID to subscribed events
    /** @type {NodeJS.Timeout|null} */
    this.heartbeatInterval = null;
    this.HEARTBEAT_INTERVAL = 30000; // 30 seconds
    this.HEARTBEAT_TIMEOUT = 10000; // 10 seconds
    
    this.setupWebSocket();
    this.startHeartbeat();
  }
  
  setupWebSocket() {
    this.fastify.get('/ws', { websocket: true }, (connection, req) => {
      const clientId = uuidv4();
      const clientIp = req.socket.remoteAddress;
      
      // Store client connection
      this.clients.set(clientId, {
        ws: connection.socket,
        ip: clientIp,
        lastHeartbeat: Date.now(),
        subscriptions: new Set(),
        metadata: {
          userAgent: req.headers['user-agent'],
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
      connection.socket.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
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
            error: error.message
          });
        }
      });
      
      // Handle client disconnect
      connection.socket.on('close', () => {
        this.handleDisconnect(clientId);
      });
      
      // Handle errors
      connection.socket.on('error', (error) => {
        this.fastify.log.error({
          msg: 'WebSocket error',
          clientId,
          error: error.message
        });
        this.handleDisconnect(clientId);
      });
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'WELCOME',
        data: {
          clientId,
          serverTime: new Date().toISOString()
        }
      });
    });
  }
  
  /**
   * Start heartbeat interval to check client connections
   */
  startHeartbeat() {
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
  
  /**
   * Handle client subscription to events
   * @param {string} clientId - The client ID
   * @param {string[]} events - Array of event types to subscribe to
   */
  handleSubscribe(clientId, events) {
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
  }
  
  /**
   * Handle client unsubscription from events
   * @param {string} clientId - The client ID
   * @param {string[]} events - Array of event types to unsubscribe from
   */
  handleUnsubscribe(clientId, events) {
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
  }
  
  /**
   * Handle client pong response
   * @param {string} clientId - The client ID
   */
  handlePong(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.lastHeartbeat = Date.now();
  }
  
  /**
   * Handle client disconnect
   * @param {string} clientId - The client ID
   */
  handleDisconnect(clientId) {
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
  
  /**
   * Send message to specific client
   * @param {string} clientId - The client ID
   * @param {Object} message - The message to send
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;
    
    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      this.fastify.log.error({
        msg: 'Error sending message to client',
        clientId,
        error: error.message
      });
      this.handleDisconnect(clientId);
    }
  }
  
  /**
   * Broadcast message to all clients subscribed to an event
   * @param {string} event - The event type
   * @param {Object} message - The message to broadcast
   */
  broadcast(event, message) {
    const subscribers = this.subscriptions.get(event);
    if (!subscribers) return;
    
    subscribers.forEach(clientId => {
      this.sendToClient(clientId, { type: event, ...message });
    });
  }
  
  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach((client, clientId) => {
      this.handleDisconnect(clientId);
    });
  }
}

export default WebSocketService; 