# 💖 SlushyLove

A lovable, Nekotina-style Discord bot packed with love & reaction commands, marriage, shipping and mini-games — with **automatic GIF provider failover** so it keeps working even when an API goes down.

## ✨ Features

### 💞 Love & reactions (47 commands)
`/hug` `/kiss` `/cuddle` `/lick` `/pat` `/slap` `/poke` `/bite` `/tickle` `/feed` `/highfive` `/wave` `/handhold` `/nom` `/bonk` `/yeet` `/kick` `/punch` `/stare` `/boop` `/airkiss` `/nuzzle` `/pinch` `/peek` `/handshake` `/baka` `/shoot` — plus `/grouphug` (hug/cuddle up to 5 people at once) and solo moods: `/dance` `/blush` `/cry` `/laugh` `/smile` `/wink` `/pout` `/smug` `/sleep` `/shrug` `/facepalm` `/happy` `/celebrate` `/clap` `/cheers` `/shy` `/nervous` `/yawn` `/thumbsup`

- Every action posts an anime GIF and tracks a counter — *"That's the 12th hug from Slushy to Pie! 💌"*
- Hit a landmark (10, 25, 50, 100…) and the bot throws a little **milestone celebration** 🎉
- Anime source is shown when known (*"From: Clannad"*)
- Most commands add a **"Hug back!" button** only the target can press 👀
- Targeting yourself or the bot gets special (sassy) responses

### 💍 Marriage & shipping
- `/marry @user` — proposal with Accept 💖 / Decline 💔 buttons
- `/divorce` — with a confirmation step (no accidental heartbreak)
- `/partner` — marriage certificate with days-married counter
- `/ship @a @b` — stable compatibility % with a heart meter (married couples score high, obviously)
- `/lovestats` — most given/received actions, favorite person, biggest fan

### 🎲 Fun & games
`/8ball` `/coinflip` `/dice` `/rate` `/wouldyourather` `/choose`

### 🛠️ Utility
`/help` (interactive category browser) `/ping` `/botinfo` (shows live GIF provider health) `/avatar` `/userinfo` `/serverinfo`

> **DMs:** love, fun and most utility commands also work in direct messages with the bot. Marriage, `/userinfo` and `/serverinfo` are server-only since they need a server to make sense.

## 🛟 GIF failover

GIFs come from five free, keyless APIs tried in order:

**nekos.best → waifu.pics → otakugifs.xyz → purrbot.site → nekos.life**

- 5-second timeout per provider, then the next one is tried
- A provider that fails 3× in a row is benched for 5 minutes (circuit breaker)
- Successful GIF URLs are cached per category — if *every* provider is down, cached GIFs are served
- Worst case (cold start + total outage) the action still works, just without a GIF. The bot never errors at users.

Check provider health live with `/botinfo`.

## 🚫 Blocking unwanted GIFs

These are curated *SFW* anime GIF APIs, but they don't tag their content, so nothing can perfectly pre-screen every clip. Instead, **you** (the bot owner) can permanently remove any GIF from rotation:

- **Block one GIF:** right-click the bot's message → **Apps → Block this GIF**. Its URL is blocklisted and never served again (the bot just fetches a different one).
- **Block a whole anime:** `/blocklist anime name:<name>` — uses the source shown in the `Anime:` footer to block every GIF from that show.
- **See what's blocked:** `/blocklist show`.

Only the bot owner can do this. The owner is auto-detected as the Discord application's owner, or set `OWNER_ID` in `.env` to override. Blocks are stored in the SQLite database, so they persist across restarts.

## 🚀 Setup

### 1. Create the Discord application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it `SlushyLove`.
2. **Bot** tab → **Reset Token** → copy it (this is your `DISCORD_TOKEN`). No privileged intents needed.
3. Invite it: **OAuth2 → URL Generator** → scopes `bot` + `applications.commands`, bot permissions **Send Messages**, **Embed Links**, **Read Message History** → open the generated URL.

### 2a. Run with Docker Compose (recommended)
```bash
cp .env.example .env     # then paste your token into .env
docker compose up -d --build
docker compose logs -f   # look for "Logged in as SlushyLove#..."
```

### 2b. Run on TrueNAS with Portainer
1. In Portainer: **Stacks → Add stack → Repository**, point it at this Git repo (or paste `docker-compose.yml` into the web editor — for the editor, change `build: .` to a prebuilt image you've pushed, or use the Repository option so Portainer can build).
2. Under **Environment variables** add `DISCORD_TOKEN` (and optionally `GUILD_ID`) — with the web editor, also delete the `env_file: .env` line since there's no file.
3. Deploy. The SQLite database lives in the `slushylove-data` volume, so marriages and counters survive updates/restarts.

To use a dataset path instead of the named volume, mount e.g. `/mnt/pool/apps/slushylove:/app/data` and make sure the folder is writable by uid `1000`.

### 2c. Run bare (no Docker)
```bash
npm install
cp .env.example .env     # add your token
npm start
```

## ⚙️ Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from the developer portal |
| `GUILD_ID` | — | Register commands to one server instantly (testing). Omit for global. |
| `DATA_DIR` | — | Where the SQLite DB lives (default `./data`, `/app/data` in Docker) |

## 🧪 Tests

```bash
npm test
```

Covers the failover engine (fallback order, circuit breaker, cache-of-last-resort, never-throws) and the database (counters, marriage lifecycle).

## 🧩 Adding your own love command

Add an entry to `src/commands/love/targeted.js` (or `moods.js`) — name, emoji, verb, the GIF category and the self/bot sass lines — and restart. If the category needs a new GIF source, add it to the provider maps in `src/gif/providers/`.
