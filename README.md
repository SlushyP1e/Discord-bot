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

### 🔗 Link fixer
`/fix <link>` — paste a TikTok, X/Twitter, Instagram, Reddit, Threads, Bluesky or Pixiv link and get back a version that actually plays inline in Discord. If the embed doesn't work, a **Try another fixer** button cycles to a backup service.

### 🧠 AI chat
`/ask <question>` — ask SlushyLove anything and get an actual answer, in her own voice: dry, quick and happy to snap back at you. Powered by **DeepSeek** by default (or any OpenAI-compatible provider).

- Or just **@mention her / reply to her messages** and she answers in the channel like a normal conversation — same brain, same memory, same rules. Off by default: it needs a privileged intent, see [below](#-chatting-by-mention).
- Remembers the last few messages of your conversation for ~15 minutes, so follow-ups work. `fresh: true` starts over, `private: true` keeps the answer to yourself.
- Every answer shows its token usage in the footer — `🪙 1,234 in · 210 out · 1,088 cached — 1,444 tokens` — so you can watch what a conversation actually costs. The `cached` figure is prompt tokens DeepSeek served from its cache at a fraction of the price.
- Nothing anyone says to `/ask` is written to disk — that memory is in RAM only and vanishes on restart.
- **Only the bot owner** can plug in an API key, choose which servers may use it, or grant `/ask` to individual people (see below).

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

## 🧠 Setting up `/ask` (owner only)

Everything about the AI is locked to **you**, the bot owner — the account that owns the Discord application (or whoever `OWNER_ID` points at). Nobody else can see or change any of it, not even server admins.

1. Grab an API key from [platform.deepseek.com](https://platform.deepseek.com/api_keys).
2. In Discord (a DM with the bot works, and is the most private place to do it):
   ```
   /aiconfig key api_key:sk-your-key-here model:deepseek-v4-flash
   ```
   Slash-command options are never posted into the channel, and the reply is ephemeral — the key never appears anywhere anyone could read it, and the bot never echoes it back.
3. Switch it on where you want it:
   ```
   /aiconfig allow          ← run this in the server you want to enable
   /aiconfig allow server_id:123456789012345678
   ```

Until you allow a server, `/ask` works for **you only**. Everyone else gets a polite "not switched on here". DMs are closed to everyone but you and anyone you've personally granted (below), since you're the one paying for the API calls.

### 🎟️ Giving one person access everywhere

Server-by-server is the blunt instrument. To hand `/ask` to a specific person **wherever they are** — your DMs, any server, even servers the bot has never been added to:

```
/access give user:@friend
/access remove user:@friend
/access list
```

A personal grant outranks the server allow-list completely: that person can use `/ask` anywhere, and nobody else's access changes. Revoking it leaves them with normal allow-listed-server access.

For it to work in a server the bot **isn't in**, they need to add SlushyLove to their own account: right-click the bot's profile → **Add App**, or use the User Install link from Developer Portal → Installation. That requires **User Install** to be enabled there (Installation → Installation Contexts → tick *User Install*). Commands then follow them around Discord instead of living in a server.

⚠️ Every grant spends your credit, and a granted person can use `/ask` in places you can't see. `/access list` shows exactly who has it.

| Subcommand | What it does |
|---|---|
| `/aiconfig key` | Set the API key, and optionally `model`, `base_url`, `provider`. Applies to the next `/ask` — no restart. |
| `/aiconfig clearkey` | Forget the key. `/ask` turns off. |
| `/aiconfig allow` / `disallow` | Add/remove a server from the allow-list (defaults to the current server). |
| `/aiconfig servers` | List the allow-listed servers. |
| `/aiconfig persona` | Bolt extra personality notes on top of the built-in one. Leave empty to reset. |
| `/aiconfig status` | Current provider, model, key state, server and grant counts. |
| `/access give` / `remove` / `list` | Give one person `/ask` everywhere, DMs and un-installed servers included. |

**Key storage:** set `CONFIG_SECRET` in `.env` to a long random string and the key is encrypted (AES-256-GCM) inside the SQLite database. Without it the key is stored as plain text in that database and the bot warns you at startup.

**Other providers:** anything speaking the OpenAI `/chat/completions` dialect works — `/aiconfig key api_key:... base_url:https://api.openai.com/v1 model:gpt-4o-mini`.

### 💬 Chatting by mention

By default `/ask` is the only way in. To also let people talk to her by **@mentioning her or replying to her messages**:

1. Developer Portal → your app → **Bot** → **Privileged Gateway Intents** → enable **Message Content Intent** → Save.
2. Set `AI_MENTION_CHAT=true` in `.env` and restart.

⚠️ Do step 1 first. Requesting that intent without it granted makes Discord refuse the connection outright and the bot won't start — the startup error tells you exactly this if it happens. (Once the bot is in 100+ servers, the intent needs Discord verification.)

What triggers a reply: a direct @mention, or replying to one of her messages. In DMs everything does. What deliberately doesn't: `@everyone`/`@here` pings that happen to reach her, role mentions, other bots, and a bare ping with no words.

The access rules are identical to `/ask` — allow-listed servers only, DMs owner-only — but a blocked mention is answered with **silence** rather than an error, since mentions are easy to fire off by accident and a bot that replies to every stray ping is worse than one that says nothing. The 8-second cooldown is shared with `/ask`, so nobody gets two budgets by switching between them, and she can never ping anyone in a reply no matter what the model writes.

### 💸 Keeping it cheap

The defaults are already tuned for the cheapest sensible setup, and a few dollars of DeepSeek credit goes a very long way (roughly **tens of thousands of questions**, at July 2026 V4-Flash rates).

- **Model:** `deepseek-v4-flash`, the budget tier. `deepseek-v4-pro` is roughly 3× the price — only worth it if you actually want harder reasoning. ⚠️ The old `deepseek-chat` / `deepseek-reasoner` names were **retired on 2026-07-24**; if you saved one with an earlier build, the bot rewrites it to `deepseek-v4-flash` on startup and logs a warning.
- **Thinking mode off.** V4 models think by default and those reasoning tokens bill as *output* — the expensive half. `AI_THINKING=auto` (the default) turns it off on DeepSeek and leaves other providers untouched. Set `AI_THINKING=enabled` if you'd rather have smarter, pricier, slower answers.
- **Prompt caching is free money.** The system prompt is identical on every request and always sits first, so DeepSeek serves it as a cache hit — dramatically cheaper than a fresh read. Changing `/aiconfig persona` invalidates that until the new prompt warms up again.
- **`AI_MAX_TOKENS=400`** caps the worst-case reply. Lower it to ~250 if you want her permanently terse.
- **`AI_MEMORY_TURNS=8`** controls how much history is resent each time. Drop it to `4` (or `0` for no memory) to cut input tokens.
- **Volume controls:** the server allow-list plus the 8-second per-user cooldown are your real spend limits. Keep `/ask` on servers you trust, and `/aiconfig disallow` is an instant off switch. `/aiconfig clearkey` is the kill switch.

DeepSeek bills per token with no monthly minimum, so an idle bot costs nothing.

### 😈 What she will and won't say

The system prompt lets her be sassy on purpose: she teases, roasts bad takes and claps back when someone comes at her sideways. What it does **not** let her do — regardless of role-play framing, "ignore your rules" prompts, or anyone claiming to be the owner:

- slurs or anything hateful/demeaning about race, ethnicity, nationality, religion, gender, gender identity, sexual orientation or disability
- anything sexual involving minors, or NSFW content generally
- targeted harassment, threats, doxxing
- encouraging self-harm or violence (she drops the sass entirely and points at real help if someone sounds like they're struggling)
- real-world harm instructions (weapons, drugs, malware), or revealing her own key/config

`/aiconfig persona` adds flavour on top, but the safety rules are always appended **last**, so a custom persona can't override them.

### 🎭 Tuning her tone

The built-in persona deliberately bans roleplay stage directions (`*blinks*`, `*twirls dramatically*`), kaomoji, "uwu", stretched words and more than one emoji per message — left to its own devices a model will drift into that within a few replies. If she still slips:

- Lower `AI_TEMPERATURE` (`0.5` is noticeably more grounded; the default is `0.7`).
- Add a nudge with `/aiconfig persona`, e.g. *"Be blunt and a bit sarcastic. No emoji at all."*
- Her memory of the last ~15 minutes is fed back to her, so a few bad replies reinforce themselves. `/ask fresh:true` wipes that thread and starts clean.

## 🚀 Setup

### 1. Create the Discord application
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) → **New Application** → name it `SlushyLove`.
2. **Bot** tab → **Reset Token** → copy it (this is your `DISCORD_TOKEN`). No privileged intents needed, unless you want [chat by @mention](#-chatting-by-mention).
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
| `OWNER_ID` | — | Your Discord user ID. Auto-detected from the application owner if unset. Gates `/blocklist` and `/aiconfig`. |
| `DATA_DIR` | — | Where the SQLite DB lives (default `./data`, `/app/data` in Docker) |
| `CONFIG_SECRET` | — | Passphrase used to encrypt the AI API key at rest. Strongly recommended. |
| `AI_API_KEY` | — | Optional starting API key for `/ask`. Normally set with `/aiconfig key` instead. |
| `AI_BASE_URL` | — | Default `https://api.deepseek.com` |
| `AI_MODEL` | — | Default `deepseek-v4-flash` |
| `AI_PERSONA` | — | Extra personality notes (safety rules still apply). Also settable via `/aiconfig persona`. |
| `AI_THINKING` | — | `auto` (default, off on DeepSeek) / `enabled` / `disabled` / `omit` |
| `AI_MEMORY_TURNS` | — | Past messages resent as context. Default `8`. |
| `AI_MENTION_CHAT` | — | `true` to also chat by @mention/reply. Needs the Message Content intent. |
| `AI_TIMEOUT_MS` / `AI_TEMPERATURE` / `AI_MAX_TOKENS` | — | Request tuning. Defaults `30000` / `0.7` / `400`. |

## 🧪 Tests

```bash
npm test
```

Covers the failover engine (fallback order, circuit breaker, cache-of-last-resort, never-throws), the database (counters, marriage lifecycle) and the AI layer (key encryption, server allow-list, guardrail ordering, reply splitting).

## 🧩 Adding your own love command

Add an entry to `src/commands/love/targeted.js` (or `moods.js`) — name, emoji, verb, the GIF category and the self/bot sass lines — and restart. If the category needs a new GIF source, add it to the provider maps in `src/gif/providers/`.
