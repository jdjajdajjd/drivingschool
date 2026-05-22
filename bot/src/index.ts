import "dotenv/config";
import { Bot, InlineKeyboard, session, type Context, type SessionFlavor } from "grammy";
import { getSkill, skills, skillTitle, type Locale } from "../../lib/skills";
import { agentLabel, buildAgentPrompt, type AgentFormat, type StoredPack } from "../../lib/prompt-builder";
import { JsonAnalyticsStore } from "./analytics";
import { channelChatId, channelUrl, loadConfig } from "./config";
import { deliverSkill } from "./delivery";
import { escapeHtml, ui } from "./messages";
import { JsonPackStore, startPackServer } from "./pack-store";

type SessionData = { locale?: Locale };
type BotContext = Context & SessionFlavor<SessionData>;

const activeStatuses = new Set(["creator", "administrator", "member"]);
const config = loadConfig();
const bot = new Bot<BotContext>(config.token);
const analytics = new JsonAnalyticsStore(config.analyticsPath);
const packStore = new JsonPackStore(config.packStoragePath);

bot.use(session({ initial: (): SessionData => ({}) }));

bot.command("start", async (ctx) => {
  const payload = ctx.match?.trim();
  const packId = parsePackPayload(payload);
  if (packId) {
    await handlePackStart(ctx, packId);
    return;
  }
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

bot.callbackQuery(/^agent_(codex|claude|cursor|universal):(.+)$/, async (ctx) => {
  const format = ctx.match[1] as AgentFormat;
  const packId = ctx.match[2];
  await ctx.answerCallbackQuery(`Preparing ${agentLabel(format)} prompt...`);
  await handlePackFormat(ctx, packId, format);
});

bot.callbackQuery(/^checkpack:(codex|claude|cursor|universal):(.+)$/, async (ctx) => {
  const format = ctx.match[1] as AgentFormat;
  const packId = ctx.match[2];
  const locale = await getLocale(ctx);
  await ctx.answerCallbackQuery(ui[locale].subscribedCheck);
  await handlePackFormat(ctx, packId, format);
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

async function handlePackStart(ctx: BotContext, packId: string) {
  const locale = await getLocale(ctx);
  const pack = await fetchPack(packId);
  if (!pack) {
    await ctx.reply(ui[locale].missingPack, { reply_markup: new InlineKeyboard().url(ui[locale].catalog, `${config.siteUrl}/catalog`) });
    return;
  }
  await ctx.reply(ui[locale].packReady, { reply_markup: agentKeyboard(pack.packId) });
}

async function handlePackFormat(ctx: BotContext, packId: string, format: AgentFormat) {
  const locale = await getLocale(ctx);
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id || ctx.callbackQuery?.message?.chat.id;
  if (!userId || !chatId) return;

  const pack = await fetchPack(packId);
  if (!pack) {
    await ctx.reply(ui[locale].missingPack, { reply_markup: new InlineKeyboard().url(ui[locale].catalog, `${config.siteUrl}/catalog`) });
    return;
  }

  const subscribed = await isSubscribed(userId);
  if (!subscribed) {
    await analytics.track({ type: "subscription_block", userId, username: ctx.from?.username, skillSlug: `pack:${pack.packId}`, subscribed: false });
    await ctx.reply(ui[locale].joinRequired("Skill Pack"), {
      reply_markup: new InlineKeyboard()
        .url(ui[locale].channel, channelUrl(config))
        .row()
        .text(ui[locale].check, `checkpack:${format}:${pack.packId}`),
    });
    return;
  }

  await analytics.track({ type: "pack_prompt", userId, username: ctx.from?.username, skillSlug: `pack:${pack.packId}:${format}`, subscribed: true });
  const prompt = buildAgentPrompt(pack, format, pack.language || locale);
  await sendPrompt(ctx, prompt, locale, pack.packId);
}

async function sendPrompt(ctx: BotContext, prompt: string, locale: Locale, packId: string) {
  await ctx.reply(ui[locale].copyPrompt);
  const chunks = chunkText(prompt, 3400);
  for (const chunk of chunks) {
    await ctx.reply(`<pre><code>${escapeHtml(chunk)}</code></pre>`, { parse_mode: "HTML" });
  }
  await ctx.reply(ui[locale].packReady, {
    reply_markup: new InlineKeyboard()
      .text(ui[locale].regenerateCodex, `agent_codex:${packId}`)
      .row()
      .text(ui[locale].regenerateClaude, `agent_claude:${packId}`)
      .row()
      .text(ui[locale].regenerateCursor, `agent_cursor:${packId}`)
      .row()
      .text(ui[locale].regenerateUniversal, `agent_universal:${packId}`)
      .row()
      .url(ui[locale].catalog, `${config.siteUrl}/catalog`),
  });
}

function agentKeyboard(packId: string) {
  return new InlineKeyboard()
    .text("Codex", `agent_codex:${packId}`)
    .text("Claude", `agent_claude:${packId}`)
    .row()
    .text("Cursor", `agent_cursor:${packId}`)
    .text("Universal", `agent_universal:${packId}`);
}

async function fetchPack(packId: string): Promise<StoredPack | undefined> {
  const localPack = await packStore.get(packId);
  if (localPack) return localPack;
  try {
    const response = await fetch(`${config.packStorageUrl}/api/packs/${packId}`);
    if (!response.ok) return undefined;
    return await response.json() as StoredPack;
  } catch (error) {
    console.warn("Pack fetch failed", error);
    return undefined;
  }
}

function chunkText(value: string, maxLength: number) {
  const chunks: string[] = [];
  let remaining = value;
  while (remaining.length > maxLength) {
    const splitAt = remaining.lastIndexOf("\n", maxLength);
    const index = splitAt > 500 ? splitAt : maxLength;
    chunks.push(remaining.slice(0, index));
    remaining = remaining.slice(index).trimStart();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

async function isSubscribed(userId: number) {
  if (config.adminUserIds.includes(userId)) return true;
  const chatId = channelChatId(config);
  if (!chatId) return true;
  try {
    const member = await bot.api.getChatMember(chatId, userId);
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

function parsePackPayload(payload?: string) {
  if (!payload) return undefined;
  if (payload.startsWith("pack_")) return payload.slice("pack_".length);
  return undefined;
}

await bot.api.setMyCommands([
  { command: "start", description: "Start bot" },
  { command: "catalog", description: "Open catalog" },
  { command: "skill", description: "Get a skill by slug" },
  { command: "lang", description: "Change language" },
  { command: "help", description: "Help" },
]);

await bot.api.deleteWebhook({ drop_pending_updates: false });
startPackServer(packStore, config.packApiPort);

console.log(`@${config.username} is running. Catalog has ${skills.length} skills.`);
await bot.start();
