import Redis from "ioredis";
import config from '../config/config.js'

const redisPort = Number(config.REDIS_PORT);
const redisDb = Number(config.REDIS_DB || 0);

export const redis = new Redis({
  host: config.REDIS_HOST,
  port: redisPort,
  username: config.REDIS_USERNAME || undefined,
  password: config.REDIS_PASSWORD,
  db: redisDb,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
  ...(String(config.REDIS_TLS).toLowerCase() === "true" ? { tls: {} } : {}),
});

redis.on("connect",()=>{
    console.log("Connecting to Redis...");
})

redis.on("ready",()=>{
    console.log(`Connected to Redis at ${config.REDIS_HOST}:${redisPort} db ${redisDb}`);
})

redis.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redis.on("close", () => {
  console.warn("Redis connection closed");
});

redis.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

export const connectRedis = async () => {
  if (redis.status === "ready") return redis;

  if (redis.status === "wait") {
    await redis.connect();
  }

  await redis.ping();
  return redis;
};
