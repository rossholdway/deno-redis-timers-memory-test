/// <reference types="npm:@types/node" />

import { createClient, type RedisClientType } from "npm:@redis/client";

const REDIS_URL = Deno.env.get("REDIS_URL") ?? "redis://redis:6379";

// How many concurrent hammer loops to run
const WORKERS = Number(Deno.env.get("WORKERS") ?? "50");
const KEY_PREFIX = "deno_redis_timer_test";

let redisInstanceCount = 0;

function makeRedisClient(): RedisClientType {
  redisInstanceCount++;
  console.log("Creating Redis client instance #", redisInstanceCount);

  const client = createClient({ url: REDIS_URL });

  client.on("error", (err) => {
    console.error("[redis error]", err);
  });

  return client;
}

const redis = makeRedisClient();
await redis.connect();

async function worker(id: number) {
  const key = `${KEY_PREFIX}:${id}`;
  let i = 0;

  while (true) {
    i++;
    try {
      await redis.set(key, String(i));
      const value = await redis.get(key);

      if (i % 10_000 === 0) {
        console.log(`worker ${id} -> i=${i}, value=${value}`);
      }
    } catch (err) {
      console.error(`worker ${id} error:`, err);
    }
  }
}

console.log(
  `Starting ${WORKERS} workers against ${REDIS_URL}...`,
);

await Promise.all(
  Array.from({ length: WORKERS }, (_, i) => worker(i)),
);
