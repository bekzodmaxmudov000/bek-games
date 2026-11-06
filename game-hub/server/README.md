# BEK GAMES multiplayer server

A small Node server that referees online games. It has no runtime dependencies (only Node built-ins).
Clients send **moves**, the server owns the **game state**: it checks whose turn it is and whether the move is legal.

## Run

```
npm install
npm run server          # http://localhost:8787
npm run dev             # the app; Vite forwards /api to the server
npm run test:server     # 31 tests, real HTTP + live streams
```

## Environment (server)

| Variable | Meaning |
| --- | --- |
| `PORT`, `HOST` | listen address (default 8787 on 0.0.0.0) |
| `ALLOWED_ORIGINS` | comma separated sites allowed to call the API. **Set it in production.** |
| `BEK_SERVER_SECRET` | signs player tokens. If missing, one is generated into `DATA_DIR/secret.key` |
| `DATA_DIR` | rooms and players are saved here (default `server/data`, git-ignored) |
| `TRUST_PROXY=1` | read the client address from `X-Forwarded-For` (behind a reverse proxy) |

The frontend only needs `VITE_API_URL` when the server lives on another address. **No secret is ever sent to or stored in the frontend**:
the token a player receives is just a signed id, useless without the server's secret.

## How it works

* **Identity**: `POST /api/auth/guest` creates a guest player and returns a signed token (`Authorization: Bearer ...`). Sending the token again keeps the same player.
* **Live updates**: `GET /api/stream` is a Server-Sent Events stream. The server pushes the full room after every change. Closing the stream marks the player offline.
* **Actions** (all `POST`, JSON): `/api/rooms`, `/api/rooms/join`, `/api/rooms/leave`, `/api/rooms/start`, `/api/rooms/move`, `/api/rooms/resign`, `/api/rooms/rematch`, `/api/queue/join`, `/api/queue/leave`.
* **Rematch**: after a game both players call `/api/rooms/rematch`; the game starts when both have asked and the seats swap. Every room update carries a growing `version`, and clients ignore older ones.
* **Rules** live in `server/games/*` and implement `GameRules`. Adding a game means adding one file and registering it in `server/games/index.ts`.
* **Cleanup**: a player offline for 30 s during a game forfeits; rooms nobody is connected to are removed after 10 min, finished rooms after 15 min, unused waiting rooms after 30 min.
* **Limits**: 4 KB request bodies, per-address rate limits, at most 5 live streams per player.

## Deploying

Run `npm run server` on any host that keeps a Node process running (a small VPS, Render, Fly.io, Railway...). Put it behind HTTPS,
set `ALLOWED_ORIGINS` to your site and give it a persistent `DATA_DIR`. Serverless functions are not suitable for the live stream.
Rooms are kept in memory and saved to disk, so one server instance is expected.
