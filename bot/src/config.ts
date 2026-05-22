export type BotConfig = {
  token: string;
  username: string;
  channelUsername?: string;
  siteUrl: string;
  packStorageUrl: string;
  packApiPort: number;
  packStoragePath: string;
  analyticsPath: string;
  adminUserIds: number[];
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function cleanUsername(value: string) {
  return value.replace(/^@/, "").trim();
}

function optionalUsername(value: string | undefined) {
  const cleaned = value?.replace(/^@/, "").trim();
  return cleaned || undefined;
}

function parseAdminIds(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isSafeInteger(item) && item > 0);
}

export function loadConfig(): BotConfig {
  return {
    token: required("TELEGRAM_BOT_TOKEN"),
    username: cleanUsername(process.env.TELEGRAM_BOT_USERNAME || "codexskillsbot"),
    channelUsername: optionalUsername(process.env.TELEGRAM_CHANNEL_USERNAME),
    siteUrl: process.env.SITE_URL || "https://drivingschool-6wy.pages.dev",
    packStorageUrl: (process.env.PACK_STORAGE_URL || "https://codex-skills-pack-api.qsenseeee.workers.dev").replace(/\/$/, ""),
    packApiPort: Number(process.env.PACK_API_PORT || 8787),
    packStoragePath: process.env.PACK_STORAGE_PATH || "bot/data/packs.json",
    analyticsPath: process.env.BOT_ANALYTICS_PATH || "bot/data/analytics.json",
    adminUserIds: parseAdminIds(process.env.TELEGRAM_ADMIN_IDS || process.env.TELEGRAM_ADMIN_ID),
  };
}

export function channelUrl(config: BotConfig) {
  if (!config.channelUsername) return config.siteUrl;
  return `https://t.me/${config.channelUsername}`;
}

export function channelChatId(config: BotConfig) {
  if (!config.channelUsername) return undefined;
  return `@${config.channelUsername}`;
}
