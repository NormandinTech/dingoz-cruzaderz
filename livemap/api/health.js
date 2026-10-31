import { loadPositions, storeKind, storeEnvNames } from "../lib/store.js";

// Public status: is the game server sending? (counts only, no IDs or positions)
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const data = await loadPositions().catch(() => null);
  res.status(200).json({
    store: storeKind,
    lastUpdateSecondsAgo: data ? Math.round((Date.now() - data.t) / 1000) : null,
    playersReported: data ? Object.keys(data.p || {}).length : 0,
    configured: !!process.env.INGEST_KEY && !!process.env.SESSION_SECRET,
    storeSettingNames: storeEnvNames, // names only, never values
  });
}
