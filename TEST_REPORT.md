# Test report — TECH ARSLAN SOFTWARE SOLUTIONS

Scope: verify the rebranded project loads, its subsystems initialise, and note
which features need external API keys or reachable third-party services.

## Environment used for testing

- Node.js v24.22.1
- npm dependencies installed from `package.json` (707 packages)
- FFmpeg provided by `@ffmpeg-installer/ffmpeg` (system FFmpeg not required)
- PM2 7.1.2

## Results

| Area | How tested | Result |
| --- | --- | --- |
| JavaScript syntax | `node --check` on all 170 JS files | Pass (0 failures) |
| JSON files | Parse all 9 JSON files | Pass (0 failures) |
| Plugin loading | Require all 143 plugin files | Pass (143/143 loaded, 0 failed) |
| Command registry | Count registered commands | Pass (334 commands across 32 categories) |
| Bot startup | `node index.js` and PM2 | Pass (server starts; waits for session) |
| Express status page | HTTP GET `/` | Pass (HTTP 200, branded page) |
| PM2 process | `pm2 start ecosystem.config.js`, restart | Pass (online, autorestart=true) |
| FFmpeg | Resolve binary and print version | Pass (ffmpeg N-47683-g0e8eb07980) |
| Sticker generation | `wa-sticker-formatter` on a PNG | Pass (valid WebP, pack = TECH ARSLAN SOFTWARE SOLUTIONS, author = TECH HACKER) |
| Downloader libraries | Require yt-dl.js, tiktok-downloader, facebook-downloader, btch-downloader, api-dylux, ruhend-scraper, yt-search, mrnima-moviedl | Pass (all load) |
| YouTube search | `yt-search` live query | Pass (18 results) |
| Google TTS | `google-tts-api` URL generation | Pass |
| QR libraries | `qrcode`, `qrcode-terminal` | Pass |
| AI provider layer | Local mock server, 2-turn conversation | Pass (context grows 2→4 messages, reset works) |
| Pairing-code login | Startup with `PAIR_NUMBER` set | Code path executes; requires WhatsApp Web reachable |
| Crash fix | Connection close with undefined `lastDisconnect` | Fixed (no longer throws) |

## Features that need configuration or external services

| Feature | Requirement |
| --- | --- |
| WhatsApp connection | `SESSION_ID` or `PAIR_NUMBER`, and network access to WhatsApp Web |
| `.ai` / `.openai` / `.claude` / `.deepseek` | `AI_PROVIDER` plus the matching `*_API_KEY` |
| `.pair` command | `PAIR_API` endpoint returning `{ "code": "XXXX-XXXX" }` |
| `.weather` | Works with the bundled key; override with `OPENWEATHER_API_KEY` |
| `.news` | Works with the bundled key; override with `NEWS_API_KEY` |
| Most downloaders, search and image commands | Reachable third-party public APIs (some free endpoints go up and down over time) |

## Known limitations observed during testing

- The public AI proxy endpoints that the original project used are now dead
  upstream (HTTP 404 / 401 / DNS failure). This build replaces them with the
  configurable provider layer in `lib/ai.js`; the old keyless endpoint is kept
  only as a last-resort fallback.
- This sandbox blocks the persistent WhatsApp WebSocket, so a full live
  pairing could not be completed here. The code path was verified to run and
  fail gracefully. On a normal VPS the pairing code prints to the console.

## Not tested here

- Live end-to-end command execution inside a real WhatsApp chat.
- Each individual downloader against live media URLs (libraries load and the
  bot's HTTP calls were not exercised per-command).

No feature was reported as working without the check listed above.

---

## Hosting crash fix (Railway / Render / Koyeb / Docker)

### Symptom
After deploying to Railway the process crashed and stopped responding.

### Root cause (reproduced locally)
`index.js` ran a 5-minute temp-cleanup timer that called `fs.unlink` on every
entry in `os.tmpdir()/cache-temp`. As soon as a sub-directory existed there,
`fs.unlink` threw `EISDIR` inside a callback that used `throw err`, which
crashed the whole Node process. The same pattern was used for the readdir error.

Reproduction (pre-fix):

```
Error: EISDIR: illegal operation on a directory, unlink '.../cache-temp/subdir'
    at ... index.js
```

### Fixes applied
| Fix | File |
| --- | --- |
| Temp cleanup uses `fs.rm(..., { recursive: true, force: true })` and logs errors instead of throwing | `index.js` |
| `tempDir` created with `{ recursive: true }` | `index.js` |
| Global `uncaughtException` / `unhandledRejection` handlers keep the bot alive | `index.js` |
| `sessions/` created recursively before session download | `index.js` |
| Mega session download logs the error instead of `throw err` | `index.js` |
| Reconnect no longer calls `connectToWA()` synchronously from its own event handler; uses a 5s backoff | `index.js` |
| `connectToWA()` body wrapped in try/catch | `index.js` |
| Plugin loading uses an absolute path (`__dirname + '/plugins/'`) | `index.js` |
| No session configured → bot stays up (web server) instead of exiting; WhatsApp connects only when a session or `PAIR_NUMBER` exists | `index.js` |
| `syncFullHistory` now defaults to `false` (env `SYNC_FULL_HISTORY`), reducing memory on small plans | `index.js` |

### Deployment assets added
- `nixpacks.toml` — installs Node.js 20 + ffmpeg on Railway/Nixpacks builds
- `Procfile` — `web: node index.js` for buildpack platforms
- `.dockerignore` — keeps `node_modules`, `sessions/`, `database.db` and secrets out of the image

### Verification (post-fix)
| Check | Result |
| --- | --- |
| Boot without session | ✅ stays up, HTTP 200, "Bot is idle" logged |
| Temp cleanup with a sub-directory present | ✅ no crash, directory removed |
| Boot with `PAIR_NUMBER` | ✅ stays up, reconnect loop with backoff |
| JS syntax (165 files) | ✅ 0 failures |
| JSON validation (10 files) | ✅ 0 failures |
| Plugin load | ✅ 143 loaded / 0 failed |

---

## "Bot connects but never replies" — root cause and fix

### Symptom
The bot started and showed as online, but replied to **no** command
(`.menu`, `.ping`, … all silent).

### Root cause (reproduced with a mocked socket)
Plugins were only required inside the `connection === 'open'` branch of the
`connection.update` handler. If WhatsApp never reached a fully open session —
the usual case with an expired/invalid `SESSION_ID`, or a session that gets
logged out — the `open` event never fired, so **zero plugins were registered**.
The message pipeline then found no matching command:

```
[DBG] reached dispatch; commands= 0
[DBG] cmdName= menu found= false
```

A second contributing bug: the dispatch call passed a fixed list of arguments
but several plugins destructure `react`, `prefix`, `isDev`, `isItzcp`, `l` or
`umarmd`, none of which were provided. For example `plugins/ai-chat.js` called
`await react("✅")` → `react is not a function`, so those commands died even when
they did load.

A third: `index.js` used a `store` object (`conn.getName`, `serializeM`,
quoted-message lookups) that was never created → `store is not defined`.

### Fixes
| Fix | File |
| --- | --- |
| Plugins are loaded by a guarded, idempotent `loadPlugins()` that logs per-file failures instead of aborting the whole load | `index.js` |
| Every dispatch site now spreads a shared `pluginArgs` object that supplies `react`, `prefix`, `isDev`, `isItzcp`, `l`, `umarmd` | `index.js` |
| An in-memory store is created and bound to the socket, so `store.*` lookups work | `index.js` |
| Logged-out sessions now print clear guidance (generate a new session / use `PAIR_NUMBER`) | `index.js` |

### Verification (mocked Baileys socket, real message pipeline)
| Check | Before | After |
| --- | --- | --- |
| Plugins registered | 0 | 143 loaded / 0 failed |
| Commands available | 0 | 334 |
| Replies sent for `.menu .ping .alive .help .sticker` | 0 | 9 |
| Reference errors during dispatch | many | 0 |
