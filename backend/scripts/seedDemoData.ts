import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

export async function seedDemoData() {
  console.log('🌱 Seeding demo data...');

  // Create demo nightclub first
  const nightclub = await prisma.nightclub.create({
    data: {
      name: 'Demo Nightclub',
      address: '123 Demo Street, Nightlife District',
      settings: {
        maxCapacity: 500,
        operatingHours: {
          open: '22:00',
          close: '04:00'
        }
      }
    }
  });

  // Create demo floor plan
  const floorPlan = await prisma.floorPlan.create({
    data: {
      name: 'Demo Floor Plan',
      imageUrl: 'https://example.com/demo-floorplan.png',
      nightclubId: nightclub.id,
      metadata: {
        scale: 1,
        units: 'meters'
      }
    }
  });

  // Create demo zones
  const zones = await Promise.all([
    prisma.zone.create({
      data: {
        name: 'Main Dance Floor',
        coordinates: { x: 0, y: 0, width: 50, height: 40 },
        capacity: 200,
        floorPlanId: floorPlan.id,
        nightclubId: nightclub.id
      }
    }),
    prisma.zone.create({
      data: {
        name: 'VIP Area',
        coordinates: { x: 60, y: 0, width: 20, height: 20 },
        capacity: 50,
        floorPlanId: floorPlan.id,
        nightclubId: nightclub.id
      }
    }),
    prisma.zone.create({
      data: {
        name: 'Bar Area',
        coordinates: { x: 0, y: 50, width: 30, height: 30 },
        capacity: 100,
        floorPlanId: floorPlan.id,
        nightclubId: nightclub.id
      }
    }),
    prisma.zone.create({
      data: {
        name: 'Chill Zone',
        coordinates: { x: 40, y: 50, width: 40, height: 40 },
        capacity: 150,
        floorPlanId: floorPlan.id,
        nightclubId: nightclub.id
      }
    })
  ]);

  // Create demo users
  const adminPassword = await hash('admin123', 10);
  const staffPassword = await hash('staff123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: adminPassword,
      name: 'Demo Admin',
      role: 'ADMIN',
      nightclubId: nightclub.id
    }
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@demo.com',
      password: staffPassword,
      name: 'Demo Staff',
      role: 'STAFF',
      nightclubId: nightclub.id
    }
  });

  // Create demo AI models
  const crowdModel = await prisma.aIModel.create({
    data: {
      name: 'Crowd Behavior Analysis',
      type: 'BEHAVIOR_ANALYSIS',
      version: '1.0.0',
      status: 'ACTIVE',
      config: {
        sensitivity: 0.8,
        updateInterval: 300
      }
    }
  });

  const anomalyModel = await prisma.aIModel.create({
    data: {
      name: 'Anomaly Detection',
      type: 'ANOMALY_DETECTION',
      version: '1.0.0',
      status: 'ACTIVE',
      config: {
        threshold: 0.7,
        windowSize: 600
      }
    }
  });

  // Create demo metrics (last 24 hours)
  const now = new Date();
  const metrics = [];
  const metricTypes = ['OCCUPANCY', 'MOVEMENT', 'NOISE', 'TEMPERATURE'];

  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(now.getTime() - (23 - i) * 3600 * 1000);
    
    for (const zone of zones) {
      for (const type of metricTypes) {
        metrics.push({
          type,
          value: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
          nightclubId: nightclub.id,
          zoneId: zone.id,
          timestamp,
          metadata: {
            source: 'DEMO',
            confidence: faker.number.float({ min: 0.8, max: 1, fractionDigits: 2 })
          }
        });
      }
    }
  }

  await prisma.realTimeMetric.createMany({
    data: metrics
  });

  // Create demo behavior analyses
  const behaviors = [];
  const behaviorTypes = ['CROWD', 'MOVEMENT', 'NOISE', 'TEMPERATURE'];

  for (let i = 0; i < 12; i++) {
    const timestamp = new Date(now.getTime() - (11 - i) * 7200 * 1000);
    
    for (const type of behaviorTypes) {
      behaviors.push({
        type,
        insights: {
          patterns: [
            faker.helpers.arrayElement(['Increasing', 'Decreasing', 'Stable', 'Fluctuating']),
            faker.helpers.arrayElement(['Normal', 'Concerning', 'Critical'])
          ],
          recommendations: [
            faker.helpers.arrayElement([
              'Monitor closely',
              'Consider staff intervention',
              'No action needed',
              'Adjust temperature'
            ])
          ],
          confidence: faker.number.float({ min: 0.8, max: 1, fractionDigits: 2 })
        },
        nightclubId: nightclub.id,
        modelId: type === 'CROWD' ? crowdModel.id : anomalyModel.id,
        timestamp
      });
    }
  }

  await prisma.behaviorAnalysis.createMany({
    data: behaviors
  });

  // Create demo anomalies
  const anomalies = [];
  const anomalyTypes = ['CROWD_DENSITY', 'MOVEMENT_PATTERN', 'NOISE_LEVEL', 'TEMPERATURE'];

  for (let i = 0; i < 5; i++) {
    const timestamp = new Date(now.getTime() - (4 - i) * 14400 * 1000);
    
    anomalies.push({
      type: faker.helpers.arrayElement(anomalyTypes),
      severity: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']),
      status: 'DETECTED',
      description: faker.helpers.arrayElement([
        'Unusual crowd movement detected',
        'Temperature rising above normal range',
        'Noise levels exceeding threshold',
        'Rapid crowd density change'
      ]),
      nightclubId: nightclub.id,
      zoneId: faker.helpers.arrayElement(zones).id,
      modelId: anomalyModel.id,
      timestamp,
      metadata: {
        source: 'DEMO',
        confidence: faker.number.float({ min: 0.8, max: 1, fractionDigits: 2 })
      }
    });
  }

  await prisma.anomaly.createMany({
    data: anomalies
  });

  // Create demo bracelets
  const bracelets = await Promise.all(
    Array.from({ length: 10 }, (_, i) => 
      prisma.bracelet.create({
        data: {
          deviceId: `DEMO-${i + 1}`,
          batteryLevel: faker.number.int({ min: 20, max: 100 }),
          status: 'ACTIVE',
          nightclubId: nightclub.id,
          metadata: {
            lastCalibration: new Date(),
            firmwareVersion: '1.0.0'
          }
        }
      })
    )
  );

  // Create demo sensors
  const sensors = await Promise.all(
    zones.flatMap(zone => 
      ['MOTION', 'TEMPERATURE', 'NOISE', 'OCCUPANCY'].map(type =>
        prisma.sensor.create({
          data: {
            type: type as any,
            status: 'ACTIVE',
            zoneId: zone.id,
            data: {
              lastReading: faker.number.float({ min: 0, max: 100 }),
              unit: type === 'TEMPERATURE' ? '°C' : '%'
            },
            metadata: {
              model: 'DEMO-SENSOR',
              firmwareVersion: '1.0.0'
            }
          }
        })
      )
    )
  );

  console.log('✅ Demo data seeded successfully!');
  console.log('\nDemo Credentials:');
  console.log('Admin: admin@demo.com / admin123');
  console.log('Staff: staff@demo.com / staff123');
  console.log('\nDemo Devices:');
  console.log('Bracelets:', bracelets.map(b => b.deviceId).join(', '));
  console.log('Sensors:', sensors.length, 'active sensors across all zones');
}

seedDemoData()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 