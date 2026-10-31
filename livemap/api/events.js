import crypto from "node:crypto";
import { readSession } from "../lib/session.js";
import { saveJSON, loadJSON } from "../lib/store.js";

// POST /api/events?key=INGEST_KEY  (from the DayZ server every ~60s)
//   {"heli":[[x,z]...],"convoy":[[x,z]...],"gas":[[x,z]...],"fog":0.1,"ovc":0.2,"wind":5,"dbg":"..."}
// GET  /api/events  (signed-in players only)
//   Gas strikes are exact. Heli crashes and convoys are returned only as a rough
//   search circle, so players still have to hunt for them. Exact spots never leave the server.
const KEY = "dingoz:events";
const TTL = 240;
const SEARCH_R = 900;   // radius of the search circle (m)
const MAX_OFF = 600;    // the real spot is somewhere inside, up to this far from the circle centre

function keyOk(req) {
  const key = String(req.query.key || "");
  const want = process.env.INGEST_KEY || "";
  return want && key.length === want.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(want));
}
const pts = (a) => (Array.isArray(a) ? a : []).slice(0, 100)
  .map((p) => [Number(p?.[0]), Number(p?.[1])])
  .filter(([x, z]) => isFinite(x) && isFinite(z) && x > -500 && x < 13500 && z > -500 && z < 13500);

function fuzz([x, z], salt) {
  // stable for a given spot (the circle doesn't jump around), but not reversible without the secret
  const h = crypto.createHmac("sha256", (process.env.SESSION_SECRET || "dz") + salt).update(`${Math.round(x)}:${Math.round(z)}`).digest();
  const ang = (h.readUInt16BE(0) / 65535) * Math.PI * 2;
  const dist = Math.sqrt(h.readUInt16BE(2) / 65535) * MAX_OFF;
  return { x: Math.round(x + Math.cos(ang) * dist), z: Math.round(z + Math.sin(ang) * dist), r: SEARCH_R };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "POST") {
    if (!keyOk(req)) return res.status(401).json({ error: "bad key" });
    let b = req.body;
    if (typeof b === "string") { try { b = JSON.parse(b); } catch { return res.status(400).json({ error: "bad json" }); } }
    const out = {
      t: Date.now(),
      heli: pts(b?.heli), convoy: pts(b?.convoy), gas: pts(b?.gas),
      fog: Number(b?.fog) || 0, ovc: Number(b?.ovc) || 0, wind: Number(b?.wind) || 0,
      dbg: String(b?.dbg || "").slice(0, 800),
    };
    await saveJSON(KEY, out, TTL);
    return res.status(200).json({ ok: true, heli: out.heli.length, convoy: out.convoy.length, gas: out.gas.length });
  }
  if (req.method !== "GET") return res.status(405).json({ error: "GET or POST" });
  if (req.query.debug && keyOk(req)) return res.status(200).json(await loadJSON(KEY).catch(() => null));
  if (!readSession(req)) return res.status(200).json({ signedIn: false });
  const e = await loadJSON(KEY).catch(() => null);
  if (!e) return res.status(200).json({ signedIn: true, live: false });
  // Takistan's mission locks fog at 0, so fog or strong wind means the sandstorm is running.
  const sandstorm = e.fog > 0.08 || e.wind > 12;
  return res.status(200).json({
    signedIn: true,
    live: Date.now() - e.t < 180_000,
    age: Math.round((Date.now() - e.t) / 1000),
    gas: e.gas.map(([x, z]) => ({ x, z, r: 120 })),
    heli: e.heli.map((p) => fuzz(p, "heli")),
    convoy: e.convoy.map((p) => fuzz(p, "convoy")),
    sandstorm,
  });
}
