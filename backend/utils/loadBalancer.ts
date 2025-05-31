import { EventEmitter } from 'events';
import WebSocket from 'ws';

interface ServerHealth {
  latency: number;
  lastCheck: number;
  isHealthy: boolean;
  errorCount: number;
  successCount: number;
}

interface GeoLocation {
  latitude: number;
  longitude: number;
  region: string;
}

interface ServerNode {
  url: string;
  weight: number;
  currentConnections: number;
  location: GeoLocation;
  health: ServerHealth;
}

interface LoadBalancerOptions {
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  maxErrorCount?: number;
  minSuccessCount?: number;
}

export class LoadBalancer extends EventEmitter {
  private servers: Map<string, ServerNode>;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private readonly options: Required<LoadBalancerOptions>;

  constructor(
    serverConfigs: { url: string; weight: number; location: GeoLocation }[],
    options: LoadBalancerOptions = {}
  ) {
    super();
    this.options = {
      healthCheckInterval: options.healthCheckInterval || 30000,
      healthCheckTimeout: options.healthCheckTimeout || 5000,
      maxErrorCount: options.maxErrorCount || 3,
      minSuccessCount: options.minSuccessCount || 2
    };

    this.servers = new Map();
    this.initializeServers(serverConfigs);
    this.startHealthChecks();
  }

  private initializeServers(
    serverConfigs: { url: string; weight: number; location: GeoLocation }[]
  ) {
    serverConfigs.forEach(config => {
      this.servers.set(config.url, {
        url: config.url,
        weight: config.weight,
        location: config.location,
        currentConnections: 0,
        health: {
          latency: 0,
          lastCheck: Date.now(),
          isHealthy: true,
          errorCount: 0,
          successCount: 0
        }
      });
    });
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(
      () => this.checkAllServersHealth(),
      this.options.healthCheckInterval
    );
  }

  private async checkAllServersHealth() {
    const checkPromises = Array.from(this.servers.entries()).map(
      async ([url, server]) => {
        try {
          const startTime = Date.now();
          const ws = new WebSocket(url + '/health');
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              ws.close();
              reject(new Error('Health check timeout'));
            }, this.options.healthCheckTimeout);

            ws.onopen = () => {
              const latency = Date.now() - startTime;
              clearTimeout(timeout);
              
              server.health.latency = latency;
              server.health.lastCheck = Date.now();
              server.health.successCount++;
              server.health.errorCount = 0;
              
              if (server.health.successCount >= this.options.minSuccessCount) {
                server.health.isHealthy = true;
              }
              
              ws.close();
              resolve();
            };

            ws.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('WebSocket connection failed'));
            };
          });
        } catch (error) {
          server.health.errorCount++;
          server.health.successCount = 0;
          
          if (server.health.errorCount >= this.options.maxErrorCount) {
            server.health.isHealthy = false;
            this.emit('server:unhealthy', { url, error });
          }
        }
      }
    );

    try {
      await Promise.all(checkPromises);
    } catch (error) {
      console.error('Error during health checks:', error);
    }
    
    this.emit('health:checked', this.getServerStats());
  }

  public getOptimalServer(clientLocation?: GeoLocation): string | null {
    let bestServer: ServerNode | null = null;
    let lowestScore = Infinity;

    for (const server of this.servers.values()) {
      if (!server.health.isHealthy) continue;

      // Calculate base score from connections and latency
      let score = (server.currentConnections / server.weight) + 
                 (server.health.latency / 1000);

      // Add geographic score if client location is provided
      if (clientLocation) {
        const distance = this.calculateDistance(
          clientLocation,
          server.location
        );
        score += distance / 1000; // Convert distance to kilometers
      }

      if (score < lowestScore) {
        lowestScore = score;
        bestServer = server;
      }
    }

    if (bestServer) {
      bestServer.currentConnections++;
      return bestServer.url;
    }

    return null;
  }

  private calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (loc1.latitude * Math.PI) / 180;
    const φ2 = (loc2.latitude * Math.PI) / 180;
    const Δφ = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const Δλ = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  public releaseConnection(serverUrl: string) {
    const server = this.servers.get(serverUrl);
    if (server && server.currentConnections > 0) {
      server.currentConnections--;
      this.emit('connection:released', { url: serverUrl, connections: server.currentConnections });
    }
  }

  public getServerStats() {
    const stats = Array.from(this.servers.entries()).map(([url, server]) => ({
      url,
      connections: server.currentConnections,
      health: server.health,
      weight: server.weight,
      location: server.location
    }));

    return {
      totalConnections: stats.reduce((sum, s) => sum + s.connections, 0),
      healthyServers: stats.filter(s => s.health.isHealthy).length,
      totalServers: stats.length,
      servers: stats
    };
  }

  public cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.servers.clear();
    this.emit('cleanup');
  }
} 