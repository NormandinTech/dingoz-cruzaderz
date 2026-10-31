import crypto from "node:crypto";
import { savePositions } from "../lib/store.js";

// Called by the DayZ server every ~15s:
// POST /api/ingest?key=INGEST_KEY  body: {"players":[{"id":"7656119...","x":1234.5,"z":6789.0,"d":90}]}
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = String(req.query.key || "");
  const want = process.env.INGEST_KEY || "";
  if (!want || key.length !== want.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(want))) {
    return res.status(401).json({ error: "bad key" });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "bad json" }); }
  }
  const list = Array.isArray(body?.players) ? body.players : [];
  const now = Date.now();
  const out = { t: now, p: {} };
  for (const pl of list.slice(0, 200)) {
    const id = String(pl.id || "");
    const x = Number(pl.x), z = Number(pl.z), d = Number(pl.d) || 0;
    if (!/^7656119\d{10}$/.test(id) || !isFinite(x) || !isFinite(z)) continue;
    if (x < -500 || x > 13500 || z < -500 || z > 13500) continue;
    out.p[id] = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, d: Math.round(d), t: now };
  }
  await savePositions(out);
  return res.status(200).json({ ok: true, players: Object.keys(out.p).length });
}
