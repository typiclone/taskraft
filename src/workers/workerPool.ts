import Redis from 'ioredis'
import { log } from '../utils/logger'
import { recordProcessed, recordFailure, setWorkerCount, observeDuration } from '../monitoring/prometheus'

const redis = new Redis()
const WORKER_COUNT = 4
const TASK_QUEUE = 'taskraft:ready'

export function startWorkerPool(redis: Redis) {
  for (let i = 0; i < WORKER_COUNT; i++) {
    runWorker(i)
  }
}

async function runWorker(id: number) {
  while (true) {
    const taskRaw = await redis.rpop(TASK_QUEUE)
    if (!taskRaw) {
      await sleep(500)
      continue
    }

    let task
    try {
      task = JSON.parse(taskRaw)
    } catch {
      recordFailure()
      continue
    }

    const start = Date.now()
    setWorkerCount(WORKER_COUNT)

    try {
      await processTask(task)
      recordProcessed()
    } catch (err) {
      recordFailure()
      log.error(`Worker ${id} failed task: ${err}`)
    }

    const duration = (Date.now() - start) / 1000
    observeDuration(duration)
  }
}

async function processTask(task: any) {
  const { taskId, payload } = task
  log.info(`Executing task ${taskId}`)
  await sleep(Math.random() * 2000 + 500)
  log.debug(`Payload: ${JSON.stringify(payload)}`)
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

for (let i = 0; i < 100; i++) {
  const task = {
    taskId: `warm-${i}`,
    payload: { x: i }
  }
  redis.lpush(TASK_QUEUE, JSON.stringify(task))
}
