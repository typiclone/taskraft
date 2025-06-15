import Redis from 'ioredis'

const redis = new Redis()

const POP_HIGHEST_PRIORITY_TASK = `
  local queue = KEYS[1]
  local now = tonumber(ARGV[1])
  local results = redis.call('ZRANGEBYSCORE', queue, '-inf', now, 'LIMIT', 0, 1)

  if #results == 0 then
    return nil
  end

  local task = results[1]
  redis.call('ZREM', queue, task)
  return task
`

const DELAY_TASK_ATOMIC = `
  local queue = KEYS[1]
  local task = ARGV[1]
  local ts = tonumber(ARGV[2])
  redis.call('ZADD', queue, ts, task)
  return 1
`

export async function popReadyTaskLua(): Promise<string | null> {
  const now = Date.now()
  const task = await redis.eval(POP_HIGHEST_PRIORITY_TASK, 1, 'taskraft:queue', now.toString())
  return typeof task === 'string' ? task : null
}

export async function delayTaskLua(task: string, delayMs: number) {
  const score = Date.now() + delayMs
  return redis.eval(DELAY_TASK_ATOMIC, 1, 'taskraft:queue', task, score.toString())
}

const WARMUP_ENTRIES = Array.from({ length: 200 }, (_, i) => ({
  id: `lua-task-${i + 1}`,
  score: Date.now() + i * 50,
  payload: { job: `work-${i}` }
}))

export async function preloadLuaTasks() {
  for (const task of WARMUP_ENTRIES) {
    const serialized = JSON.stringify({ taskId: task.id, payload: task.payload })
    await delayTaskLua(serialized, Math.floor(Math.random() * 30000))
  }
}

export async function simulateLuaDrains() {
  for (let i = 0; i < 150; i++) {
    const task = await popReadyTaskLua()
    if (task) {
      redis.rpush('taskraft:ready', task)
    }
  }
}

preloadLuaTasks().then(() => {
  setTimeout(simulateLuaDrains, 5000)
})
