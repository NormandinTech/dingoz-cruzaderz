// Position store. Uses Upstash Redis (REST) when its env vars are present,
// otherwise falls back to in-memory (fine for testing, not reliable in production).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const KEY = "dingoz:positions";
const TTL = 120; // seconds; positions vanish if the server stops sending

const mem = globalThis.__dzMem || (globalThis.__dzMem = { value: null, exp: 0 });

export const storeKind = URL_ && TOKEN ? "redis" : "memory";

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

export async function savePositions(obj) {
  const s = JSON.stringify(obj);
  if (storeKind === "redis") return redis(["SET", KEY, s, "EX", String(TTL)]);
  mem.value = s;
  mem.exp = Date.now() + TTL * 1000;
}

export async function loadPositions() {
  let s = null;
  if (storeKind === "redis") s = await redis(["GET", KEY]);
  else if (mem.exp > Date.now()) s = mem.value;
  return s ? JSON.parse(s) : null;
}
