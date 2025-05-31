import { FastifyInstance, FastifyRequest, FastifyReply, RouteHandlerMethod, RouteShorthandOptions, RouteGenericInterface } from 'fastify';
import { Server } from 'ws';
import { IncomingMessage, ServerResponse } from 'http';
import { WebSocket } from 'ws';
import { ZodType } from 'zod';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  nightclubId?: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: AuthenticatedUser;
}

export interface FastifyInstanceWithServices extends FastifyInstance {
  websocketServer: Server<typeof WebSocket, typeof IncomingMessage>;
  locationTracker: {
    trackLocation: (braceletId: string, zoneId: string) => Promise<void>;
    getLocation: (braceletId: string) => Promise<string | null>;
  };
}

export interface FastifyInstanceWithLocationTracker extends FastifyInstance {
  locationTracker: {
    trackLocation: (braceletId: string, zoneId: string) => Promise<void>;
    getLocation: (braceletId: string) => Promise<string | null>;
  };
}

export type RoutePlugin = (fastify: FastifyInstance) => Promise<void>;
export type RoutePluginWithLocationTracker = (fastify: FastifyInstanceWithLocationTracker) => Promise<void>;

export interface RouteSchema {
  body?: ZodType;
  params?: ZodType;
  querystring?: ZodType;
  response?: Record<number, ZodType>;
}

export interface RouteOptions extends RouteShorthandOptions {
  schema?: RouteSchema;
  preHandler?: RouteHandlerMethod[];
}

export type AuthenticatedRouteHandler<T extends RouteGenericInterface = RouteGenericInterface> = RouteHandlerMethod<
  T,
  AuthenticatedRequest,
  FastifyReply
>;

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: RouteHandlerMethod;
    authenticateAdmin: RouteHandlerMethod;
  }

  interface FastifyRequest {
    user: AuthenticatedUser;
  }
}

export { FastifyRequest, FastifyReply, FastifyInstance, RouteHandlerMethod }; 