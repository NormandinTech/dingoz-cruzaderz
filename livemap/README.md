# DingoZ Live Map

Live position + road routing map for the DingoZ CruZaderZ DayZ server. Deployed on Vercel (root directory `livemap`).

- `api/ingest` receives player positions from the game server (secret key)
- `api/auth/*` Steam OpenID sign-in
- `api/me` returns only the signed-in player's own position
- `roads.json` road graph traced from the Takistan map

Env vars: `INGEST_KEY`, `SESSION_SECRET`, and Upstash Redis (`KV_REST_API_URL`/`KV_REST_API_TOKEN`).
