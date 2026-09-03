# 💖 SlushyLove

A lovable, Nekotina-style Discord bot packed with love & reaction commands, marriage, shipping and mini-games — with **automatic GIF provider failover** so it keeps working even when an API goes down.

## ✨ Features

### 💞 Love & reactions (47 commands)
`/hug` `/kiss` `/cuddle` `/lick` `/pat` `/slap` `/poke` `/bite` `/tickle` `/feed` `/highfive` `/wave` `/handhold` `/nom` `/bonk` `/yeet` `/kick` `/punch` `/stare` `/boop` `/airkiss` `/nuzzle` `/pinch` `/peek` `/handshake` `/baka` `/shoot` — plus `/grouphug` (hug/cuddle up to 5 people at once) and solo moods: `/dance` `/blush` `/cry` `/laugh` `/smile` `/wink` `/pout` `/smug` `/sleep` `/shrug` `/facepalm` `/happy` `/celebrate` `/clap` `/cheers` `/shy` `/nervous` `/yawn` `/thumbsup`

- Every action posts an anime GIF and tracks a counter — *"That's the 12th hug from Slushy to Pie! 💌"*
- Hit a landmark (10, 25, 50, 100…) and the bot throws a little **milestone celebration** 🎉
- Anime source is shown when known (*"From: Clannad"*)
- Most commands add a **"Hug back!" button** only the target can press 👀
- **In a one-on-one DM you can skip the target** — `/hug` on its own hugs whoever you're talking to. In a DM with SlushyLove herself, it hugs her. Naming someone always wins, so `/hug user:@yourself` is how you self-hug. In a server or a group DM she asks who you meant rather than guessing.
- Targeting yourself or the bot gets special (sassy) responses

### 💍 Marriage & shipping
- `/marry @user` — proposal with Accept 💖 / Decline 💔 buttons
- `/divorce` — with a confirmation step (no accidental heartbreak)
- `/partner` — marriage certificate with days-married counter
- `/ship @a @b` — stable compatibility % with a heart meter (married couples score high, obviously)
- `/lovestats` — most given/received actions, favorite person, biggest fan

### 🎲 Fun & games
`/8ball` `/coinflip` `/dice` `/rate` `/wouldyourather` `/choose` — `/wouldyourather` posts a live A/B poll: anyone can vote with the buttons, and the embed shows the running tally with a 👑 on the leader. One vote per person (clicking again is politely refused), and polls expire after 24 hours. The person who made the poll can hit **Results 🔎** to see an ephemeral breakdown of exactly who voted for what.

### 🔗 Link fixer
`/fix <link>` — paste a TikTok, X/Twitter, Instagram, Reddit, Threads, Bluesky or Pixiv link and get back a version that actually plays inline in Discord. If the embed doesn't work, a **Try another fixer** button cycles to a backup service. Before replying, the bot quietly pings each fixer service and skips any that are down, so a dead proxy (they go dark without warning) never gets handed to you.

### 🧠 AI chat
`/ask <question>` — ask SlushyLove anything and get an actual answer, in her own voice: dry, quick and happy to snap back at you. Powered by **DeepSeek** by default (or any OpenAI-compatible provider).

- Or just **@mention her / reply to her messages** and she answers in the channel like a normal conversation — same brain, same memory, same rules. Off by default: it needs a privileged intent, see [below](#-chatting-by-mention).
- **She can see images.** Attach one to `/ask` with the `image` option, or post a picture while @mentioning her — a caption is optional. Needs a vision-capable model (`gpt-5-nano` is; check yours). Roughly 600–700 input tokens per image, so a few thousandths of a cent each.
- Remembers the last few messages of your conversation for ~15 minutes, so follow-ups work. `fresh: true` starts over, `private: true` keeps the answer to yourself.
- Every answer shows its token usage in the footer — `🪙 1,234 in · 210 out · 1,088 cached — 1,444 tokens` — so you can watch what a conversation actually costs. `cached` is prompt tokens the provider served from its cache at a fraction of the price; `thinking` (reasoning models only) is hidden reasoning you don't see but do pay for.
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

**Other providers:** anything speaking the OpenAI `/chat/completions` dialect works. To switch to OpenAI's budget tier:

```
/aiconfig key api_key:sk-your-openai-key base_url:https://api.openai.com/v1 model:gpt-5-nano provider:openai
```

The request body is shaped per model automatically. GPT-5 and o-series models reject `temperature` and renamed the token cap to `max_completion_tokens`, so those are handled for you — the bot detects them from the model name, including proxied forms like `openai/gpt-5-nano`. Classic models (`gpt-4o-mini`, Groq, Llama) keep the parameters they understand, and only DeepSeek ever sees the `thinking` field.

`AI_REASONING_EFFORT` (default `minimal`) controls how much hidden thinking a reasoning model buys before answering. Those thinking tokens are invisible in the reply but billed at the output rate, so `minimal` is the right setting for chat; `low`/`medium`/`high` trade money and latency for depth, and `default` lets the model choose. Because that budget shares the completion cap, reasoning models get a floor of 1,200 tokens regardless of `AI_MAX_TOKENS` — otherwise the model can spend the entire allowance thinking and return nothing.

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
- **Images cost input tokens, once.** An image is sent only on the turn it arrives; the conversation memory keeps `[sent an image]` in its place. Follow-up questions about the same picture therefore don't pay for it again — which also avoids Discord's signed CDN links expiring out from under a stored conversation.
- **Volume controls:** the server allow-list plus the 8-second per-user cooldown are your real spend limits. Keep `/ask` on servers you trust, and `/aiconfig disallow` is an instant off switch. `/aiconfig clearkey` is the kill switch.

DeepSeek bills per token with no monthly minimum, so an idle bot costs nothing.

### 😈 What she will and won't say

The system prompt lets her be genuinely rude on purpose. She swears like a normal adult, and if someone starts on her she goes back at them properly — no politeness padding, no being the bigger person. She matches escalation rather than setting it: start something and you get both barrels, just chat and she's decent, and if someone is actually upset rather than play-fighting she drops it instantly.

What it does **not** let her do — regardless of role-play framing, "ignore your rules" prompts, or anyone claiming to be the owner:

- slurs or anything hateful/demeaning about race, ethnicity, nationality, religion, gender, gender identity, sexual orientation or disability — swearing at someone is fine, bigotry isn't; she goes after what you *said*, never what you *are*
- anything sexual involving minors, or NSFW content generally
- organised pile-ons, threats of violence, doxxing, or anything aimed at someone who isn't in the conversation
- encouraging self-harm or violence (she drops the sass entirely and points at real help if someone sounds like they're struggling)
- real-world harm instructions (weapons, drugs, malware), or revealing her own key/config

`/aiconfig persona` adds flavour on top, but the safety rules are always appended **last**, so a custom persona can't override them.

### 🎭 Tuning her tone

The built-in persona deliberately bans roleplay stage directions (`*blinks*`, `*twirls dramatically*`), kaomoji, "uwu", stretched words, more than one emoji per message, and plugging her own commands — left to its own devices a model will drift into all of that within a few replies. She's a general chat companion who happens to be called SlushyLove, not a mascot for the hug commands. If she still slips:

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

The image ships with a built-in **healthcheck**: the container serves `GET /healthz` on port 3000 internally and Docker marks it unhealthy if that stops answering — so NAS dashboards show real status, and `docker ps` tells a hung bot from a live one at a glance.

### 2b. Run on ZimaOS (or CasaOS)

ZimaOS installs apps from a compose file but can't build one from source, so the bot ships as a prebuilt image.

1. **Publish the image once.** GitHub → **Actions** → *Publish container image* → **Run workflow**. (It also runs automatically when `src/` or the `Dockerfile` changes on the default branch.)
   > GitHub only lists a workflow — and only shows its **Run workflow** button — once the file is on the repository's **default branch**. If Actions shows you a "Choose a workflow" gallery instead, the workflow hasn't been merged yet. Merge it first; don't configure one of the suggested templates.
2. **Make the package public.** GitHub → your profile → **Packages** → `discord-bot` → **Package settings** → **Change visibility** → *Public*. Skip this and ZimaOS fails the pull with `denied`.
3. **Import it.** Open [`docker-compose.zimaos.yml`](docker-compose.zimaos.yml), fill in `DISCORD_TOKEN` and `CONFIG_SECRET`, then in the ZimaOS dashboard: **➕** (top right) → **Import** → **Docker Compose** → paste → **Submit**.
4. There's no web UI — it's a bot, it only makes outbound connections — so leave any port or WebUI field blank.
5. Configure the AI from inside Discord with `/aiconfig key`. Nothing else needs editing on the NAS.

Data lives in `/DATA/AppData/slushylove`, which is ZimaOS's app-data convention, so it survives updates and restarts. To upgrade later: re-run the workflow, then hit **Update** on the app tile (or `docker compose pull && docker compose up -d` over SSH).

**Prefer not to publish an image?** ZimaOS has SSH and a normal Docker CLI, so you can clone and build on the device instead:

```bash
git clone https://github.com/SlushyP1e/Discord-bot.git /DATA/AppData/slushylove-src
cd /DATA/AppData/slushylove-src
cp .env.example .env   # add your token
docker compose up -d --build
```

That skips steps 1–3 entirely, at the cost of the app not appearing as a ZimaOS tile.

### 2c. Run on TrueNAS with Portainer
1. In Portainer: **Stacks → Add stack → Repository**, point it at this Git repo (or paste `docker-compose.yml` into the web editor — for the editor, change `build: .` to a prebuilt image you've pushed, or use the Repository option so Portainer can build).
2. Under **Environment variables** add `DISCORD_TOKEN` (and optionally `GUILD_ID`) — with the web editor, also delete the `env_file: .env` line since there's no file.
3. Deploy. The SQLite database lives in the `slushylove-data` volume, so marriages and counters survive updates/restarts.

To use a dataset path instead of the named volume, mount e.g. `/mnt/pool/apps/slushylove:/app/data` and make sure the folder is writable by uid `1000`.

### 2d. Run bare (no Docker)
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
| `AI_REASONING_EFFORT` | — | GPT-5/o-series thinking budget. `minimal` (default) / `low` / `medium` / `high` / `default`. |
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
