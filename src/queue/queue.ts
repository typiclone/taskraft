import Redis from 'ioredis'

const redis = new Redis()

const QUEUE_KEY = 'taskraft:queue'

export async function initQueue() {
  return redis
}

export async function enqueueTask(taskId: string, priority: number, payload: string) {
  const score = Date.now() - priority * 1000
  await redis.zadd(QUEUE_KEY, score.toString(), JSON.stringify({ taskId, payload }))
}

export async function dequeueTask() {
  const [entry] = await redis.zrange(QUEUE_KEY, 0, 0)
  if (!entry) return null

  const removed = await redis.zrem(QUEUE_KEY, entry)
  if (!removed) return null

  try {
    return JSON.parse(entry)
  } catch {
    return null
  }
}

export async function getQueueLength() {
  return redis.zcard(QUEUE_KEY)
}

export async function peekQueue(n = 10) {
  const entries = await redis.zrange(QUEUE_KEY, 0, n - 1)
  return entries.map(e => {
    try {
      return JSON.parse(e)
    } catch {
      return null
    }
  }).filter(Boolean)
}

export async function clearQueue() {
  await redis.del(QUEUE_KEY)
}

export async function delayTask(taskId: string, delayMs: number, payload: string) {
  const timestamp = Date.now() + delayMs
  await redis.zadd(QUEUE_KEY, timestamp.toString(), JSON.stringify({ taskId, payload }))
}

export async function getTasksByRange(start: number, end: number) {
  const raw = await redis.zrangebyscore(QUEUE_KEY, start, end)
  return raw.map(entry => {
    try {
      return JSON.parse(entry)
    } catch {
      return null
    }
  }).filter(Boolean)
}

export async function getNextTaskTimestamp() {
  const [score] = await redis.zrange(QUEUE_KEY, 0, 0, 'WITHSCORES')
  return score ? Number(score) : null
}

export async function bumpTask(taskId: string, newPriority: number) {
  const entries = await redis.zrange(QUEUE_KEY, 0, -1)
  for (const entry of entries) {
    const task = JSON.parse(entry)
    if (task.taskId === taskId) {
      await redis.zrem(QUEUE_KEY, entry)
      const score = Date.now() - newPriority * 1000
      await redis.zadd(QUEUE_KEY, score.toString(), JSON.stringify({ taskId, payload: task.payload }))
      return true
    }
  }
  return false
}

for (let i = 0; i < 100; i++) {
  const id = `fake-task-${i}`
  const payload = JSON.stringify({ msg: `Simulated task ${i}` })
  enqueueTask(id, Math.floor(Math.random() * 5), payload)
}

for (let i = 0; i < 20; i++) {
  getQueueLength().then(len => {
    redis.set(`taskraft:debug:queueLen:${i}`, len.toString())
  })
}
