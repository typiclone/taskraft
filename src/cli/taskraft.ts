#!/usr/bin/env tsx
/**
 * Taskraft CLI (no external dependencies)
 * Usage examples:
 *   tsx src/cli/taskraft.ts enqueue --queue default --priority 5 --msg "hello"
 *   tsx src/cli/taskraft.ts stats --queue default
 *   tsx src/cli/taskraft.ts purge --queue default
 *   tsx src/cli/taskraft.ts demo
 */

import { InMemoryStore } from "../store/mem";
import { register, get } from "../workers/registry";
import { echoWorker } from "../workers/examples/echo";
import { logger } from "../utils/logger";

const store = new InMemoryStore();
register("echo", echoWorker);

function parseArgs() {
  const [,, cmd, ...rest] = process.argv;
  const args: Record<string, string> = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i].startsWith("--")) {
      const key = rest[i].slice(2);
      args[key] = rest[i+1] ?? "true";
      i++;
    }
  }
  return { cmd, args };
}

async function main() {
  const { cmd, args } = parseArgs();

  switch (cmd) {
    case "enqueue": {
      const q = args.queue ?? "default";
      const p = parseInt(args.priority ?? "0", 10);
      const msg = args.msg ?? "no message";
      const id = store.enqueue({
        queue: q,
        priority: p,
        delayMs: 0,
        maxAttempts: 3,
        payload: { worker: "echo", msg },
      });
      logger.info(`Enqueued job ${id} to ${q} with priority ${p}`);
      break;
    }

    case "stats": {
      const q = args.queue ?? "default";
      const stats = store.stats(q);
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case "purge": {
      const q = args.queue ?? "default";
      // quick purge by re-instantiating the store
      (store as any).readyByQueue?.delete(q);
      logger.info(`Purged queue ${q}`);
      break;
    }

    case "demo": {
      // enqueue some demo jobs and process them immediately
      store.enqueue({ queue: "default", priority: 5, delayMs: 0, maxAttempts: 3, payload: { worker: "echo", msg: "demo1" } });
      store.enqueue({ queue: "default", priority: 1, delayMs: 2000, maxAttempts: 3, payload: { worker: "echo", msg: "demo2" } });

      for (let tick = 0; tick < 5; tick++) {
        const j = store.claim("default");
        if (!j) { await sleep(500); continue; }
        const worker = get((j.payload as any)?.worker ?? "echo");
        try {
          await worker(j);
          store.ack(j.id);
          logger.info(`Job ${j.id} completed`);
        } catch (e: any) {
          store.fail(j.id, e?.message ?? "error");
          logger.error(`Job ${j.id} failed`);
        }
      }
      console.log("Final stats:", store.stats("default"));
      break;
    }

    default:
      console.log(`Unknown command: ${cmd}
Usage:
  enqueue --queue <q> --priority <n> --msg <text>
  stats --queue <q>
  purge --queue <q>
  demo
`);
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main();
