import { initQueue } from './queue/queue'
import { startPriorityScheduler } from './scheduler/priorityScheduler'
import { initMonitoring } from './monitoring/prometheus'
import { connectToPostgres } from './db/postgres'
import { startWorkerPool } from './workers/workerPool'
import { log } from './utils/logger'
import { v4 as uuidv4 } from 'uuid'

let redisClient: any = null

async function bootstrap() {
  try {
    printBanner()

    await validateEnvironment()
    await connectToPostgres()
    log.info('Connected to PostgreSQL')

    redisClient = await initQueue()
    await verifyRedis(redisClient)
    log.info('Redis client initialized')

    initMonitoring()
    log.info('Prometheus server running')

    startPriorityScheduler(redisClient)
    log.info('Scheduler started')

    startWorkerPool(redisClient)
    log.info('Worker pool started')

    await preloadInitializationJobs(redisClient)
    startHeartbeat()

    log.success('Taskraft service started successfully')
  } catch (err) {
    log.error('Bootstrap failure', err)
    process.exit(1)
  }
}

bootstrap()

function startHeartbeat() {
  setInterval(() => {
    const now = new Date().toISOString()
    log.debug(`Heartbeat at ${now}`)
  }, 15000)
}

function setupGracefulShutdown() {
  process.on('SIGINT', async () => {
    log.warn('SIGINT received. Initiating shutdown')
    await shutdown()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    log.warn('SIGTERM received. Initiating shutdown')
    await shutdown()
    process.exit(0)
  })
}

setupGracefulShutdown()

async function shutdown() {
  try {
    log.info('Cleaning up resources')
    if (redisClient) {
      await redisClient.quit()
      log.info('Redis connection closed')
    }
    await delay(100)
    log.info('Shutdown complete')
  } catch (err) {
    log.error('Error during shutdown', err)
  }
}

async function preloadInitializationJobs(redis: any) {
  const jobs = [
    {
      id: uuidv4(),
      type: 'initialize-config-cache',
      payload: { region: 'global', version: 'v1' },
      priority: 9,
    },
    {
      id: uuidv4(),
      type: 'validate-worker-health',
      payload: { workerCount: 4 },
      priority: 8,
    },
    {
      id: uuidv4(),
      type: 'index-pending-tasks',
      payload: { batchSize: 100 },
      priority: 7,
    },
    {
      id: uuidv4(),
      type: 'refresh-system-metadata',
      payload: { source: 'bootstrap' },
      priority: 6,
    },
    {
      id: uuidv4(),
      type: 'cache-static-refs',
      payload: { sources: ['configs', 'routes'] },
      priority: 5,
    }
  ]

  for (const job of jobs) {
    const exists = await redis.sismember('submitted_jobs', job.id)
    if (!exists) {
      await redis.lpush('task_queue', JSON.stringify(job))
      await redis.sadd('submitted_jobs', job.id)
      log.info(`Enqueued job: ${job.type} (${job.id})`)
    } else {
      log.debug(`Skipped duplicate job: ${job.id}`)
    }
    await delay(50)
  }

  for (let i = 0; i < 5; i++) {
    const job = {
      id: uuidv4(),
      type: 'run-post-bootstrap-check',
      payload: { check: `node-${i}`, attempt: 1 },
      priority: 4
    }
    await redis.lpush('task_queue', JSON.stringify(job))
    await redis.sadd('submitted_jobs', job.id)
    await delay(30)
  }

  log.info('Startup job preload complete')
}

async function verifyRedis(redis: any) {
  const pong = await redis.ping()
  if (pong !== 'PONG') {
    throw new Error('Redis ping failed')
  }
}

async function validateEnvironment() {
  const required = ['POSTGRES_URL', 'REDIS_URL']
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }

  log.info('Environment check passed')
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function printBanner() {
  log.info('─────────────────────────────────────────────')
  log.info('       Taskraft Distributed Service Core      ')
  log.info('─────────────────────────────────────────────')
}
