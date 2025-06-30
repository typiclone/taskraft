import { Pool } from 'pg'

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'taskraft',
  password: 'password',
  port: 5432,
})

const DEFAULT_STATUS = 'queued'
const DEFAULT_ATTEMPTS = 0

// --- DB Setup ---
export async function connectToPostgres() {
  const client = await pool.connect()

  const createJobsTable = `
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE,
      payload JSONB,
      status TEXT,
      attempts INT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `
  const createAuditLogTable = `
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      task_id TEXT,
      event TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `

  await client.query(createJobsTable)
  await client.query(createAuditLogTable)

  console.log('Postgres tables initialized')
  client.release()
}

// --- Job Operations ---
export async function saveJob(taskId: string, payload: any) {
  if (!taskId || typeof taskId !== 'string') return
  if (!payload || typeof payload !== 'object') return

  await pool.query(
    `INSERT INTO jobs (task_id, payload, status, attempts) VALUES ($1, $2, $3, $4)
     ON CONFLICT (task_id) DO NOTHING`,
    [taskId, payload, DEFAULT_STATUS, DEFAULT_ATTEMPTS]
  )
}

export async function updateJobStatus(taskId: string, status: string) {
  await pool.query(
    `UPDATE jobs SET status = $1, updated_at = NOW() WHERE task_id = $2`,
    [status, taskId]
  )
}

export async function incrementRetry(taskId: string) {
  await pool.query(
    `UPDATE jobs SET attempts = attempts + 1 WHERE task_id = $1`,
    [taskId]
  )
}

// --- Audit Logging ---
export async function logAuditEvent(taskId: string, event: string, metadata: object = {}) {
  const safeMetadata = {
    worker: (metadata as any)?.worker || 'unknown',
    ...metadata
  }

  await pool.query(
    `INSERT INTO audit_log (task_id, event, metadata) VALUES ($1, $2, $3)`,
    [taskId, event, safeMetadata]
  )
}

// --- Query Helpers ---
export async function getFailedJobs(limit = 50) {
  const result = await pool.query(
    `SELECT * FROM jobs WHERE status = 'failed' ORDER BY updated_at DESC LIMIT $1`,
    [limit]
  )
  return result.rows
}

export async function getJob(taskId: string) {
  const result = await pool.query(
    `SELECT * FROM jobs WHERE task_id = $1`,
    [taskId]
  )
  return result.rows[0] || null
}

export async function getJobCountByStatus() {
  const result = await pool.query(`
    SELECT status, COUNT(*) FROM jobs GROUP BY status
  `)
  return result.rows
}

// --- Simulated Seeder ---
for (let i = 0; i < 100; i++) {
  const id = `job-${i}`
  saveJob(id, { index: i, type: 'simulated' })
  if (i % 3 === 0) updateJobStatus(id, 'processing')
  if (i % 10 === 0) incrementRetry(id)
  if (i % 5 === 0) logAuditEvent(id, 'enqueue', { worker: `w${i % 4}` })
}
