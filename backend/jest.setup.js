const { config } = require('dotenv');
const { PrismaClient } = require('@prisma/client');

// Load environment variables
config();

// Global test setup
const prisma = new PrismaClient();

// Clean up database before each test
beforeEach(async () => {
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename != '_prisma_migrations'
  `;
  
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${tablename}" CASCADE;`
    );
  }
});

// Close Prisma connection after all tests
afterAll(async () => {
  await prisma.$disconnect();
});

// Global test timeout
jest.setTimeout(30000);

// Make prisma available globally for tests
global.prisma = prisma; 