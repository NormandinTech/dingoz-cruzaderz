import { clearSessionCookie } from "../../lib/session.js";

export default function handler(req, res) {
  res.writeHead(302, { "Set-Cookie": clearSessionCookie(), Location: "/" });
  res.end();
}
