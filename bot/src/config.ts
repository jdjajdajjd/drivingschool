export type BotConfig = {
  token: string;
  username: string;
  channelUsername: string;
  siteUrl: string;
  analyticsPath: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function cleanUsername(value: string) {
  return value.replace(/^@/, "").trim();
}

export function loadConfig(): BotConfig {
  return {
    token: required("TELEGRAM_BOT_TOKEN"),
    username: cleanUsername(process.env.TELEGRAM_BOT_USERNAME || "vroomleadsbot"),
    channelUsername: cleanUsername(required("TELEGRAM_CHANNEL_USERNAME")),
    siteUrl: process.env.SITE_URL || "https://drivingschool-6wy.pages.dev",
    analyticsPath: process.env.BOT_ANALYTICS_PATH || "bot/data/analytics.json",
  };
}

export function channelUrl(config: BotConfig) {
  return `https://t.me/${config.channelUsername}`;
}

export function channelChatId(config: BotConfig) {
  return `@${config.channelUsername}`;
}
