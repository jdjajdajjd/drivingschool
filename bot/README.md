# Telegram Bot MVP

The site sends skill requests to Telegram with a start parameter:

```text
https://t.me/<TELEGRAM_BOT_USERNAME>?start=skill_<slug>
```

The Node.js MVP lives in `bot/src/index.ts` and uses `grammy`.

## Commands

- `/start` - welcome screen with catalog and channel buttons.
- `/start skill_<slug>` - starts the skill delivery flow.
- `/help` - short help text.
- `/skill <slug>` - request a skill by slug.
- `/catalog` - open the site catalog.
- `/lang` - switch English/Russian bot text.

## Flow

1. Parse `/start skill_<slug>` or `/skill <slug>`.
2. Resolve the skill from the shared `lib/skills.ts` dataset.
3. Check subscription with `getChatMember`.
4. If the user is not subscribed, show `Join channel` and `Check subscription` buttons.
5. If subscribed, send title, description, install command, source info, and a short instruction.

The delivery layer is isolated in `bot/src/delivery.ts`, so later it can send `.zip`, `.md`, or generated files instead of only text.

## Env

```text
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_CHANNEL_USERNAME=your_channel_username
TELEGRAM_ADMIN_IDS=778851427
SITE_URL=https://drivingschool-6wy.pages.dev
BOT_ANALYTICS_PATH=bot/data/analytics.json
```

`TELEGRAM_ADMIN_IDS` is a comma-separated allowlist. Admin users can test skill delivery even when the channel subscription gate is not ready yet.

For static site links, set public build env when changing the bot username:

```text
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
NEXT_PUBLIC_TELEGRAM_CHANNEL_USERNAME=your_channel_username
NEXT_PUBLIC_SITE_URL=https://drivingschool-6wy.pages.dev
```

## Run

```bash
npm run bot:dev
```

Analytics are stored as JSON by default in `bot/data/analytics.json`:

- user id;
- username if available;
- requested skill slug;
- date;
- subscribed / not subscribed;
- selected language.

The bot should be an administrator of the channel. Without admin access, Telegram membership checks can be unreliable for some channels.
