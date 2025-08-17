import { createClient, RedisClientType, defineScript } from "redis";
import { CONFIG } from "./config.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const luaPath = path.resolve(__dirname, "../..", "lua", "claim_next.lua");
const claimScript = fs.readFileSync(luaPath, "utf8");

export let redis: RedisClientType;

export async function initRedis() {
  redis = createClient({ url: CONFIG.REDIS_URL });
  redis.on("error", (e) => console.error(e));
  await redis.connect();
  defineScript({ NUMBER_OF_KEYS: 4, SCRIPT: claimScript, NAME: "taskraftClaim" })(redis);
  return redis;
}
