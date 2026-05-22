const fallbackBotUsername = "codexskillsbot";
const retiredBotUsernames = new Set(["vroomleadsbot"]);

function cleanUsername(value: string | undefined) {
  const username = (value || fallbackBotUsername).replace(/^@/, "").trim();
  return retiredBotUsernames.has(username.toLowerCase()) ? fallbackBotUsername : username;
}

export const siteConfig = {
  url: process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://drivingschool-6wy.pages.dev",
  telegramBotUsername: cleanUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME),
  telegramChannelUsername: cleanUsername(process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_USERNAME || process.env.TELEGRAM_CHANNEL_USERNAME),
};

export function telegramBotUrl(start?: string) {
  const url = new URL(`https://t.me/${siteConfig.telegramBotUsername}`);
  if (start) url.searchParams.set("start", start);
  return url.toString();
}

export function telegramSkillUrl(slug: string) {
  return telegramBotUrl(`skill_${slug}`);
}
