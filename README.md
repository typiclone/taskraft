# Taskraft – Distributed Task Queue Manager

A TypeScript-based job queue system built for high-performance task execution with Redis, PostgreSQL, and Prometheus. Designed to support priority queuing, atomic scheduling via Lua scripting, task retries, and real-time observability.

---

## 💡 Features

- **Priority Queues** with Redis sorted sets
- **Delayed & Retriable Jobs** with atomic Lua scripts
- **Docker-Ready Worker Pools** for parallel task execution
- **PostgreSQL Persistence** of metadata, audit logs, and retry history
- **Prometheus Metrics Exporter** for queue stats and task timings
- **Custom Scheduler Engine** for polling, rebalancing, and queue draining

---

## 📦 Stack

- **Node.js + TypeScript**
- **Redis (zset + list)**
- **PostgreSQL (via Prisma)**
- **Prometheus (via prom-client)**
- **Lua Scripts for atomic ops**

---

## 📁 Project Structure

```txt
src/
│
├── queue/              # Redis-based enqueue/dequeue logic
├── scheduler/          # Priority scheduler + Lua-based logic
├── workers/            # Worker pool logic with concurrency
├── db/                 # PostgreSQL access layer
├── monitoring/         # Prometheus metrics exporter
├── utils/              # Logger and helpers
│
config/                 # Environment variable mapping
scripts/                # One-off seeders and initializers
prisma/                 # Prisma schema
