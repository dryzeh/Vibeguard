import { buildTestApp } from '../utils/buildTestApp.js';
import { seedDemoData } from './seedDemoData.js';
import RealTimeProcessor from '../services/realTimeProcessor.js';
import WebSocketService from '../services/websocket.js';
import { Redis } from 'ioredis';

async function runDemo() {
  console.log('🚀 Starting VibeGuard Demo Environment...');

  // Build app with test configuration
  const app = await buildTestApp({
    logger: true, // Enable logging for demo
    redis: new Redis({
      host: 'localhost',
      port: 6379,
      db: 1 // Use a separate DB for demo
    })
  });

  // Seed demo data
  await seedDemoData();

  // Start real-time data simulation
  const realTimeProcessor = new RealTimeProcessor(app);
  const wsService = app.ws as WebSocketService;

  // Get the actual nightclub ID from seeded data
  const nightclub = await app.prisma.nightclub.findFirst();
  if (!nightclub) {
    throw new Error('No nightclub found in demo data');
  }

  // Simulate real-time metrics
  setInterval(() => {
    const metric = {
      type: ['OCCUPANCY', 'MOVEMENT', 'NOISE', 'TEMPERATURE'][Math.floor(Math.random() * 4)],
      value: Math.random() * 100,
      nightclubId: nightclub.id,
      timestamp: new Date(),
      metadata: {
        source: 'DEMO',
        confidence: 0.9 + Math.random() * 0.1
      }
    };

    // Process metric (this will also check for anomalies)
    realTimeProcessor.processMetric(metric).catch(console.error);

    // Broadcast to WebSocket clients
    wsService.broadcast('METRIC_UPDATE', metric);
  }, 5000); // Every 5 seconds

  // Start server
  const port = parseInt(process.env.PORT || '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`\n✅ Demo server running at http://localhost:${port}`);
  console.log('\nDemo Features:');
  console.log('1. Real-time metrics simulation (every 5s)');
  console.log('2. Anomaly detection via metric processing');
  console.log('3. WebSocket updates for metrics and anomalies');
  console.log('4. Pre-seeded data for testing');
  console.log('\nUse Ctrl+C to stop the demo server');
}

runDemo().catch((err) => {
  console.error('Error running demo:', err);
  process.exit(1);
}); 