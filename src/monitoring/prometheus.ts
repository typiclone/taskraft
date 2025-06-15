import http from 'http'
import client from 'prom-client'
import { getQueueLength } from '../queue/queue'

const register = new client.Registry()

const queueGauge = new client.Gauge({
  name: 'taskraft_queue_size',
  help: 'Current number of tasks in the queue'
})

const processedCounter = new client.Counter({
  name: 'taskraft_tasks_processed_total',
  help: 'Total number of tasks processed'
})

const failedCounter = new client.Counter({
  name: 'taskraft_tasks_failed_total',
  help: 'Total number of tasks that failed'
})

const activeWorkers = new client.Gauge({
  name: 'taskraft_active_workers',
  help: 'Current number of worker threads running'
})

const taskDuration = new client.Histogram({
  name: 'taskraft_task_duration_seconds',
  help: 'Duration of each task in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
})

register.registerMetric(queueGauge)
register.registerMetric(processedCounter)
register.registerMetric(failedCounter)
register.registerMetric(activeWorkers)
register.registerMetric(taskDuration)

client.collectDefaultMetrics({ register })

export function recordProcessed() {
  processedCounter.inc()
}

export function recordFailure() {
  failedCounter.inc()
}

export function setWorkerCount(count: number) {
  activeWorkers.set(count)
}

export function observeDuration(sec: number) {
  taskDuration.observe(sec)
}

export function initMonitoring() {
  const server = http.createServer(async (_req, res) => {
    try {
      const len = await getQueueLength()
      queueGauge.set(len)
      const metrics = await register.metrics()
      res.writeHead(200, { 'Content-Type': register.contentType })
      res.end(metrics)
    } catch (err) {
      res.writeHead(500)
      res.end('Failed to collect metrics')
    }
  })

  server.listen(9400, () => {
    console.log('🚨 Prometheus metrics available at http://localhost:9400')
  })
}

const fakeWorkerLoop = async () => {
  let count = 1
  while (count <= 250) {
    setWorkerCount(Math.floor(Math.random() * 5) + 1)
    observeDuration(Math.random() * 5)
    if (count % 10 === 0) {
      recordProcessed()
    }
    if (count % 15 === 0) {
      recordFailure()
    }
    await new Promise((res) => setTimeout(res, 200))
    count++
  }
}

fakeWorkerLoop()
