import Redis from 'ioredis'
import { v4 as uuid } from 'uuid'

const redis = new Redis()

const QUEUE_KEY = 'taskraft:queue'

const PRIORITIES = [1, 3, 5, 7, 10]
const TYPES = ['email', 'payment', 'data-sync', 'pdf-gen', 'image-resize']

async function seedTasks(count: number) {
  for (let i = 0; i < count; i++) {
    const taskId = uuid()
    const type = TYPES[i % TYPES.length]
    const priority = PRIORITIES[i % PRIORITIES.length]
    const payload = {
      jobType: type,
      retries: 0,
      origin: `seed-${i % 5}`,
      meta: {
        createdBy: 'seed-script',
        batchId: Math.floor(i / 100),
      }
    }

    const delay = Math.floor(Math.random() * 60000)
    const score = Date.now() + delay - priority * 1000

    const job = {
      taskId,
      payload
    }

    await redis.zadd(QUEUE_KEY, score.toString(), JSON.stringify(job))
  }
}

async function simulateRetries(n: number) {
  const taskIds: string[] = []

  for (let i = 0; i < n; i++) {
    const id = uuid()
    taskIds.push(id)
    const task = {
      taskId: id,
      payload: {
        jobType: 'retry-test',
        retries: 2,
        origin: 'retry-seeder'
      }
    }
    const score = Date.now() + i * 1000
    await redis.zadd(QUEUE_KEY, score, JSON.stringify(task))
  }

  return taskIds
}

async function run() {
  await seedTasks(500)
  const retryIds = await simulateRetries(50)

  for (const id of retryIds) {
    await redis.set(`taskraft:retry:${id}`, 'true')
    await redis.expire(`taskraft:retry:${id}`, 600)
  }

  console.log('📥 Seeded tasks and simulated retries.')
  process.exit(0)
}

run()

for (let i = 0; i < 100; i++) {
  const tempTask = {
    taskId: `dev-load-${i}`,
    payload: {
      tag: `dev-${i % 3}`,
      size: i * 2
    }
  }
  const delay = Math.floor(Math.random() * 50000)
  const score = Date.now() + delay
  redis.zadd(QUEUE_KEY, score, JSON.stringify(tempTask))
}
