import { originOf } from "../../lib/session.js";

// Sends the player to Steam's official sign-in page (OpenID 2.0).
export default function handler(req, res) {
  const origin = originOf(req);
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${origin}/api/auth/callback`,
    "openid.realm": origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  res.writeHead(302, { Location: `https://steamcommunity.com/openid/login?${p}` });
  res.end();
}
