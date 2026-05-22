import "dotenv/config";
import { Bot, InlineKeyboard, session, type Context, type SessionFlavor } from "grammy";
import { getSkill, skills, skillTitle, type Locale } from "../../lib/skills";
import { JsonAnalyticsStore } from "./analytics";
import { channelChatId, channelUrl, loadConfig } from "./config";
import { deliverSkill } from "./delivery";
import { skillCard, ui } from "./messages";

type SessionData = { locale?: Locale };
type BotContext = Context & SessionFlavor<SessionData>;

const activeStatuses = new Set(["creator", "administrator", "member"]);
const config = loadConfig();
const bot = new Bot<BotContext>(config.token);
const analytics = new JsonAnalyticsStore(config.analyticsPath);

bot.use(session({ initial: (): SessionData => ({}) }));

bot.command("start", async (ctx) => {
  const payload = ctx.match?.trim();
  const slug = parseSkillPayload(payload);
  if (slug) {
    await handleSkillRequest(ctx, slug);
    return;
  }

  const locale = await getLocale(ctx);
  await ctx.reply(ui[locale].welcome, {
    reply_markup: new InlineKeyboard()
      .url(ui[locale].catalog, config.siteUrl)
      .row()
      .url(ui[locale].channel, channelUrl(config)),
  });
});

bot.command("help", async (ctx) => {
  const locale = await getLocale(ctx);
  await ctx.reply(ui[locale].help);
});

bot.command("catalog", async (ctx) => {
  const locale = await getLocale(ctx);
  await ctx.reply(ui[locale].catalog, {
    reply_markup: new InlineKeyboard().url(ui[locale].catalog, `${config.siteUrl}/#catalog`),
  });
});

bot.command("skill", async (ctx) => {
  const slug = ctx.match?.trim();
  if (!slug) {
    const locale = await getLocale(ctx);
    await ctx.reply(ui[locale].skillUsage);
    return;
  }
  await handleSkillRequest(ctx, slug);
});

bot.command("lang", async (ctx) => {
  const locale = await getLocale(ctx);
  await ctx.reply(ui[locale].chooseLang, {
    reply_markup: new InlineKeyboard().text("English", "lang:en").text("Русский", "lang:ru"),
  });
});

bot.callbackQuery(/^lang:(en|ru)$/, async (ctx) => {
  const locale = ctx.match[1] as Locale;
  ctx.session.locale = locale;
  if (ctx.from) await analytics.setLanguage(ctx.from.id, locale);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(ui[locale].langSet).catch(() => ctx.reply(ui[locale].langSet));
});

bot.callbackQuery(/^check:(.+)$/, async (ctx) => {
  const locale = await getLocale(ctx);
  await ctx.answerCallbackQuery(ui[locale].subscribedCheck);
  await handleSkillRequest(ctx, ctx.match[1]);
});

bot.on("message:text", async (ctx) => {
  const locale = await getLocale(ctx);
  await ctx.reply(ui[locale].help);
});

bot.catch((error) => {
  console.error("Bot error", error);
});

async function handleSkillRequest(ctx: BotContext, slug: string) {
  const locale = await getLocale(ctx);
  const normalizedSlug = slug.replace(/^skill_/, "");
  const skill = getSkill(normalizedSlug);
  const userId = ctx.from?.id;
  if (!skill || !userId) {
    await ctx.reply(ui[locale].missingSkill);
    return;
  }

  await analytics.track({
    type: "skill_request",
    userId,
    username: ctx.from?.username,
    skillSlug: skill.slug,
  });

  const subscribed = await isSubscribed(userId);
  if (!subscribed) {
    await analytics.track({
      type: "subscription_block",
      userId,
      username: ctx.from?.username,
      skillSlug: skill.slug,
      subscribed: false,
    });
    await ctx.reply(ui[locale].joinRequired(skillTitle(skill, locale)), {
      reply_markup: new InlineKeyboard()
        .url(ui[locale].channel, channelUrl(config))
        .row()
        .text(ui[locale].check, `check:${skill.slug}`),
    });
    return;
  }

  await analytics.track({
    type: "skill_delivered",
    userId,
    username: ctx.from?.username,
    skillSlug: skill.slug,
    subscribed: true,
  });

  await deliverSkill({
    ctx,
    skill,
    locale,
    keyboard: new InlineKeyboard().url(ui[locale].catalog, `${config.siteUrl}/skills/${skill.slug}`),
  });
}

async function isSubscribed(userId: number) {
  try {
    const member = await bot.api.getChatMember(channelChatId(config), userId);
    return activeStatuses.has(member.status);
  } catch (error) {
    console.warn("Subscription check failed. Is the bot an admin of the channel?", error);
    return false;
  }
}

async function getLocale(ctx: BotContext): Promise<Locale> {
  if (ctx.session.locale) return ctx.session.locale;
  if (ctx.from) {
    const saved = await analytics.getLanguage(ctx.from.id);
    if (saved) {
      ctx.session.locale = saved;
      return saved;
    }
  }
  const languageCode = ctx.from?.language_code?.toLowerCase() || "";
  return languageCode.startsWith("ru") ? "ru" : "en";
}

function parseSkillPayload(payload?: string) {
  if (!payload) return undefined;
  if (payload.startsWith("skill_")) return payload.slice("skill_".length);
  if (skills.some((skill) => skill.slug === payload)) return payload;
  return undefined;
}

await bot.api.setMyCommands([
  { command: "start", description: "Start bot" },
  { command: "catalog", description: "Open catalog" },
  { command: "skill", description: "Get a skill by slug" },
  { command: "lang", description: "Change language" },
  { command: "help", description: "Help" },
]);

console.log(`@${config.username} is running. Catalog has ${skills.length} skills.`);
await bot.start();
