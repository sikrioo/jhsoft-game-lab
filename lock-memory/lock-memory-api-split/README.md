# Lock Memory API Split

This split package turns the original single-file Lock Memory prototype into:

- `frontend/`: GitHub Pages-friendly static client
- `backend/`: Node.js + Express + SQLite API

The frontend keeps rendering, touch input, demo playback, and UI effects.
The backend owns pattern generation, session creation, score validation, leaderboard writes, and daily challenge generation.

## Structure

```text
lock-memory-api-split/
  frontend/
    index.html
    style.css
    game.js
    config.js
  backend/
    package.json
    data/
    migrations/
      0001_init.sql
    src/
      db.js
      index.js
      pattern-engine.js
```

## Frontend Notes

- By default `frontend/config.js` uses the current HTTP origin, or `http://127.0.0.1:3000` when opened outside a server context.
- The frontend is plain HTML/CSS/JS and can still be deployed separately, but when it is not served by the same Node app you should point `frontend/config.js` at your API server origin.
- When you open the frontend with VS Code Live Server on a `5500`-series localhost port, it now automatically targets `http://127.0.0.1:3000` for API requests.
- The frontend now includes persisted `NEON`, `SIMPLE`, and `WILD` themes, tighter mobile touch handling, timer text throttling, and a particle cap for long sessions.
- Ranked score submission only happens in `DOUBT` mode.
- `ZEN` mode still requests protected patterns from the API, but keeps score locally as practice-only.

## Backend Notes

- `Express` handles HTTP routes and can also serve the `frontend/` files directly.
- `better-sqlite3` stores data in `backend/data/lock-memory.db` by default.
- The SQLite schema auto-initializes from `backend/migrations/0001_init.sql` on startup.
- Pattern generation now uses the `v2` tier-progress difficulty curve and cached MASTER symmetry variants.
- `POST /api/pattern`
- `POST /api/score/submit`
- `GET /api/leaderboard?mode=DOUBT&period=daily`
- `GET /api/daily`
- `GET /api/health`

The server stores stage sessions in SQLite and uses those stored values to verify:

- session existence
- no resubmission for the same session
- stage and mode consistency
- exact pattern match
- plausible elapsed time
- combo progression
- server-side score recalculation

## Local Run

1. From `backend/`, run `npm install`.
2. Start the local server with `npm run dev` or `npm start`.
3. Open `http://127.0.0.1:3000`.
4. If you want a different port or DB file, set `PORT`, `HOST`, `CORS_ORIGIN`, or `DB_FILE`.

## Assumptions

- I added a `runId` field to keep ranked score progression verifiable across stages.
- The SQLite schema extends the original `sessions` table with server-owned run and score state fields needed for validation.
- Daily challenge generation is deterministic by date and cached in SQLite after first request.
