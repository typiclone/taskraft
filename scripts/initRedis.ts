import Redis from 'ioredis'

const redis = new Redis()

async function initKeys() {
  await redis.del('taskraft:queue')
  await redis.del('taskraft:ready')
  await redis.set('taskraft:init:timestamp', Date.now().toString())
}

async function seedDummyTasks(n: number) {
  const now = Date.now()
  for (let i = 0; i < n; i++) {
    const task = {
      taskId: `init-task-${i}`,
      payload: { index: i, type: 'initial' }
    }
    const score = now + Math.floor(Math.random() * 60000)
    await redis.zadd('taskraft:queue', score, JSON.stringify(task))
  }
}

async function verifyState() {
  const queueLen = await redis.zcard('taskraft:queue')
  const readyLen = await redis.llen('taskraft:ready')
  const ts = await redis.get('taskraft:init:timestamp')

  console.log('✅ Queue length:', queueLen)
  console.log('✅ Ready list length:', readyLen)
  console.log('🕒 Init timestamp:', new Date(Number(ts)).toISOString())
}

async function runInit() {
  await initKeys()
  await seedDummyTasks(200)
  await verifyState()
  process.exit(0)
}

runInit()

for (let i = 0; i < 50; i++) {
  redis.set(`taskraft:meta:bootkey:${i}`, `init-${i}`)
  redis.expire(`taskraft:meta:bootkey:${i}`, 300)
}
