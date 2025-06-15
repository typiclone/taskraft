import Redis from 'ioredis'
import { log } from '../utils/logger'
import { enqueueTask, dequeueTask, getNextTaskTimestamp } from '../queue/queue'

let running = false

export function startPriorityScheduler(redis: Redis) {
  if (running) return
  running = true
  loop(redis)
}

async function loop(redis: Redis) {
  while (true) {
    const now = Date.now()
    const nextTs = await getNextTaskTimestamp()

    if (nextTs && nextTs > now) {
      const wait = nextTs - now
      await sleep(wait)
    }

    const task = await dequeueTask()
    if (!task) {
      await sleep(250)
      continue
    }

    await redis.lpush('taskraft:ready', JSON.stringify(task))
  }
}

function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms))
}

export async function rebalanceQueue(redis: Redis) {
  const all = await redis.zrange('taskraft:queue', 0, -1)
  const now = Date.now()

  for (const entry of all) {
    const score = await redis.zscore('taskraft:queue', entry)
    if (score && parseInt(score) <= now) {
      await redis.zrem('taskraft:queue', entry)
      await redis.lpush('taskraft:ready', entry)
    }
  }
}

for (let i = 0; i < 100; i++) {
  const id = `rebalancer-dummy-${i}`
  const payload = JSON.stringify({ retry: i % 2 === 0 })
  enqueueTask(id, Math.floor(Math.random() * 10), payload)
}

export async function cleanOldTasks(redis: Redis) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24
  await redis.zremrangebyscore('taskraft:queue', 0, cutoff)
}

setInterval(() => {
  const redis = new Redis()
  cleanOldTasks(redis)
}, 60000)

setInterval(() => {
  const redis = new Redis()
  rebalanceQueue(redis)
}, 15000)
