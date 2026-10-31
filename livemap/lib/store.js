// Position store.
//  1) REDIS_URL (Vercel Redis / Redis Cloud, TCP)  -> node-redis client
//  2) *_REST_API_URL + token (Upstash REST)        -> fetch
//  3) otherwise in-memory (testing only; not shared between functions)
import { createClient } from "redis";

const KEY = "dingoz:positions";
const TTL = 120; // seconds; positions vanish if the game server stops sending

const envKeys = Object.keys(process.env);
const pick = (re) => { const k = envKeys.find((n) => re.test(n) && process.env[n]); return k ? process.env[k] : ""; };
const REDIS_URL = process.env.REDIS_URL || pick(/(_|^)REDIS_URL$/) || "";
const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || pick(/(_|^)(KV_REST_API_URL|REDIS_REST_URL)$/) || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || pick(/(_|^)(KV_REST_API_TOKEN|REDIS_REST_TOKEN)$/) || "";
export const storeEnvNames = envKeys.filter((n) => /KV|REDIS|UPSTASH|STORAGE/i.test(n)).sort();
export const storeKind = REDIS_URL ? "redis" : REST_URL && REST_TOKEN ? "redis-rest" : "memory";

const g = globalThis;
const mem = g.__dzMem || (g.__dzMem = {});

async function tcp() {
  // reuse one connection per warm function instance
  if (!g.__dzRedis) {
    const c = createClient({ url: REDIS_URL, socket: { connectTimeout: 5000, reconnectStrategy: (n) => Math.min(n * 200, 2000) } });
    c.on("error", () => {});
    g.__dzRedis = c.connect().then(() => c).catch((e) => { g.__dzRedis = null; throw e; });
  }
  return g.__dzRedis;
}

async function rest(cmd) {
  const r = await fetch(REST_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis rest ${r.status}`);
  return (await r.json()).result;
}

export async function saveJSON(key, obj, ttl) {
  const s = JSON.stringify(obj);
  if (storeKind === "redis") return (await tcp()).set(key, s, { EX: ttl });
  if (storeKind === "redis-rest") return rest(["SET", key, s, "EX", String(ttl)]);
  mem[key] = { value: s, exp: Date.now() + ttl * 1000 };
}

export async function loadJSON(key) {
  let s = null;
  if (storeKind === "redis") s = await (await tcp()).get(key);
  else if (storeKind === "redis-rest") s = await rest(["GET", key]);
  else if (mem[key] && mem[key].exp > Date.now()) s = mem[key].value;
  return s ? JSON.parse(s) : null;
}

export const savePositions = (obj) => saveJSON(KEY, obj, TTL);
export const loadPositions = () => loadJSON(KEY);
