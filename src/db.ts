import { Pool } from "pg";
import { CONFIG } from "./config.js";

export const pg = new Pool({ connectionString: CONFIG.PG_URL });

export async function migrate() {
  await pg.query(`
    create table if not exists jobs_meta(
      id text primary key,
      queue text not null,
      priority int not null,
      payload jsonb not null,
      max_attempts int not null,
      backoff_ms int not null,
      created_at timestamptz not null default now()
    );
    create table if not exists job_history(
      id text not null,
      status text not null check (status in ('enqueued','started','succeeded','failed','retried')),
      attempts int not null,
      error text,
      at timestamptz not null default now()
    );
    create index if not exists job_history_id_idx on job_history(id);
  `);
}
