import crypto from "node:crypto";

const SECRET = process.env.SESSION_SECRET || "";
const COOKIE = "dz_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const b64u = (b) => Buffer.from(b).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

export function makeSessionCookie(steamId) {
  const payload = b64u(JSON.stringify({ sid: steamId, exp: Math.floor(Date.now() / 1000) + MAX_AGE }));
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;

export function readSession(req) {
  if (!SECRET) return null;
  const raw = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!/^7656119\d{10}$/.test(data.sid) || data.exp < Date.now() / 1000) return null;
    return data.sid;
  } catch {
    return null;
  }
}

export function originOf(req) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers["x-forwarded-host"] || req.headers.host}`;
}
