const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    },
  },
  log: ['query', 'error', 'warn'],
});

async function connectWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await prisma.$connect();
      console.log('Successfully connected to MySQL database');
      return;
    } catch (error) {
      console.error(`Connection attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      // 等待 2 秒後重試
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

connectWithRetry().catch(error => {
  console.error('Final connection attempt failed:', error);
  process.exit(1);
});

module.exports = prisma;
