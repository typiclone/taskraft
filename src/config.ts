export const CONFIG = {
  REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
  PG_URL: process.env.PG_URL ?? "postgres://postgres:postgres@localhost:5432/taskraft",
  METRICS_PORT: parseInt(process.env.METRICS_PORT ?? "9464", 10),
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY ?? "1", 10),
  QUEUE_NAME: process.env.QUEUE_NAME ?? "default",
  CLAIM_BATCH: parseInt(process.env.CLAIM_BATCH ?? "100", 10),
  LOCK_TTL_MS: parseInt(process.env.LOCK_TTL_MS ?? "30000", 10)
};