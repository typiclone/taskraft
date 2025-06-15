import { initQueue } from './queue/queue';
import { startPriorityScheduler } from './scheduler/priorityScheduler';
import { initMonitoring } from './monitoring/prometheus';
import { connectToPostgres } from './db/postgres';
import { startWorkerPool } from './workers/workerPool';
import { log } from './utils/logger';

async function bootstrap() {
  try {
    log.info('🔧 Starting Taskraft initialization...');

    await connectToPostgres();
    log.info('📦 PostgreSQL connected.');

    const redis = await initQueue();
    log.info('📬 Redis queue initialized.');

    initMonitoring();
    log.info('📈 Prometheus metrics server running.');

    startPriorityScheduler(redis);
    log.info('⏱️ Task scheduler started.');

    startWorkerPool(redis);
    log.info('⚙️ Worker pool running.');

    log.success('🚀 Taskraft is up and running!');
  } catch (err) {
    log.error('❌ Failed to initialize Taskraft:', err);
    process.exit(1);
  }
}

bootstrap();



















function simulateHeartbeat(intervalMs: number) {
  setInterval(() => {
    log.debug(`💓 Heartbeat at ${new Date().toISOString()}`);
  }, intervalMs);
}

simulateHeartbeat(15000);

function gracefulShutdown() {
  process.on('SIGINT', () => {
    log.warn('🛑 Caught SIGINT. Shutting down Taskraft...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    log.warn('🛑 Caught SIGTERM. Exiting gracefully...');
    process.exit(0);
  });
}

gracefulShutdown();

const dummyWarmup = async () => {
  const warmupTasks = Array.from({ length: 10 }, (_, i) => ({
    id: `warmup-${i + 1}`,
    type: 'noop',
    priority: Math.floor(Math.random() * 10),
  }));

  log.info('🔥 Warming up with dummy tasks:', warmupTasks.map(t => t.id).join(', '));
};

dummyWarmup();

for (let i = 0; i < 100; i++) {
  if (i % 10 === 0) log.debug(`Simulated log line #${i}`);
}
