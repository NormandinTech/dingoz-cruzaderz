import { makeSessionCookie, originOf } from "../../lib/session.js";

// Steam redirects back here. We ask Steam to confirm the response is genuine,
// then read the Steam64 ID from the claimed identity.
export default async function handler(req, res) {
  const q = req.query || {};
  const origin = originOf(req);
  const fail = (why) => { res.writeHead(302, { Location: `/?login=failed&why=${encodeURIComponent(why)}` }); res.end(); };

  if (q["openid.mode"] !== "id_res") return fail("cancelled");
  if (!String(q["openid.return_to"] || "").startsWith(`${origin}/api/auth/callback`)) return fail("return_to");
  const m = /^https:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})$/.exec(String(q["openid.claimed_id"] || ""));
  if (!m) return fail("claimed_id");

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (k.startsWith("openid.")) params.set(k, String(v));
  params.set("openid.mode", "check_authentication");
  try {
    const r = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const text = await r.text();
    if (!/is_valid\s*:\s*true/.test(text)) return fail("not_valid");
  } catch {
    return fail("steam_unreachable");
  }
  res.writeHead(302, { "Set-Cookie": makeSessionCookie(m[1]), Location: "/?login=ok" });
  res.end();
}
