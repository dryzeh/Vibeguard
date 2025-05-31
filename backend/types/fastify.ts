import { FastifyInstance, FastifyPluginOptions, FastifyRequest, RouteHandlerMethod, FastifyReply, RouteGenericInterface, RawServerDefault, FastifySchema, FastifyTypeProviderDefault, FastifyBaseLogger, RouteShorthandOptions } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { JWT } from '@fastify/jwt';
import { WebSocket, Server } from 'ws';
import { IncomingMessage } from 'http';

// Define Config type based on our .env structure
export interface Config {
  // Server
  port: number;
  host: string;
  nodeEnv: string;
  
  // Database
  databaseUrl: string;
  dbMaxConnections: number;
  dbIdleTimeout: number;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  
  // Security
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  corsOrigin: string[];
  
  // Email
  emailEnabled: boolean;
  emailProvider: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
  
  // Logging
  logLevel: string;
  logFormat: string;
  logFile: string;
  
  // Feature flags
  features: {
    emailVerification: boolean;
    passwordReset: boolean;
    realtimeAlerts: boolean;
    aiAnalysis: boolean;
    emergencyMode: boolean;
  };
  
  // Emergency handling
  emergency: {
    alertThreshold: number;
    autoLockdown: boolean;
    cleanupInterval: number;
  };
  
  // WebSocket
  ws: {
    pingInterval: number;
    pongTimeout: number;
    maxPayload: number;
  };
  
  // Admin
  admin: {
    defaultPassword: string;
    maxLoginAttempts: number;
  };
  
  // Frontend
  frontendUrl: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    jwt: JWT;
    config: Config;
    authenticate: RouteHandlerMethod;
    ws: any; // TODO: type this properly
  }
}

export type FastifyInstanceWithServices = FastifyInstance;

export type RoutePlugin = (
  fastify: FastifyInstanceWithServices,
  options: FastifyPluginOptions,
  done: (err?: Error) => void
) => void;

// Define the authenticated user type
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

// Extend FastifyRequest to include user property
export interface AuthenticatedRequest<T extends RouteGenericInterface = RouteGenericInterface> extends FastifyRequest<
  T,
  RawServerDefault,
  IncomingMessage,
  FastifySchema,
  FastifyTypeProviderDefault,
  FastifyBaseLogger
> {
  user: AuthenticatedUser;
}

// Define the location tracker interface
export interface LocationTracker {
  updateLocation: (braceletId: string, location: { x: number; y: number }) => void;
  getLocation: (braceletId: string) => { x: number; y: number } | null;
  getBraceletsInZone: (zoneId: string) => string[];
}

// Define the websocket server interface
export interface WebSocketServer {
  clients: Set<WebSocket>;
  broadcast: (data: string) => void;
}

// Define the FastifyInstance with location tracker
export type FastifyInstanceWithLocationTracker = FastifyInstance & {
  locationTracker: LocationTracker;
  websocketServer: WebSocketServer;
};

// Define the route plugin type
export type RoutePluginWithLocationTracker = (
  fastify: FastifyInstanceWithLocationTracker,
  options: FastifyPluginOptions,
  done: (err?: Error) => void
) => void;

// Define the authenticated route handler type
export type AuthenticatedRouteHandler<T extends RouteGenericInterface = RouteGenericInterface> = (
  request: AuthenticatedRequest<T>,
  reply: FastifyReply
) => Promise<any>; 