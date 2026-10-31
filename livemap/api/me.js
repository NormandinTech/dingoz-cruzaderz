import { readSession } from "../lib/session.js";
import { loadPositions } from "../lib/store.js";

// Returns ONLY the signed-in player's own position. Never anyone else's.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const sid = readSession(req);
  if (!sid) return res.status(200).json({ signedIn: false });
  const data = await loadPositions().catch(() => null);
  const mine = data?.p?.[sid];
  const fresh = mine && Date.now() - mine.t < 90_000;
  return res.status(200).json({
    signedIn: true,
    steamId: sid,
    serverLive: !!data && Date.now() - data.t < 90_000,
    online: !!fresh,
    pos: fresh ? { x: mine.x, z: mine.z, d: mine.d, t: mine.t } : null,
  });
}
