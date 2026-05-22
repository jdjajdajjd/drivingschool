# Telegram Bot Flow

The site sends skill requests to Telegram with a start parameter:

```text
https://t.me/<TELEGRAM_BOT_USERNAME>?start=skill_<slug>
```

Required environment variables:

```text
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_BOT_TOKEN=123456:telegram-token
TELEGRAM_CHANNEL_USERNAME=your_channel_username
SITE_URL=https://drivingschool-6wy.pages.dev
```

For the static site build, also set public equivalents when you need a non-default bot username in client-rendered links:

```text
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
NEXT_PUBLIC_TELEGRAM_CHANNEL_USERNAME=your_channel_username
NEXT_PUBLIC_SITE_URL=https://drivingschool-6wy.pages.dev
```

Flow implemented in `telegram-worker.ts`:

1. Parse `/start skill_<slug>`.
2. Resolve the skill from the catalog dataset.
3. Check channel membership with `getChatMember`.
4. If the user is not subscribed, show `Join channel` and `Check subscription` buttons.
5. If subscribed, send the skill summary, install command, and a short usage note.

The bot should be an administrator of the channel. Without admin access, Telegram membership checks can be unreliable for some channels.
