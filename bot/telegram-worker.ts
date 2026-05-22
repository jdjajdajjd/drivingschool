import { getSkill, skillDescription, skillTitle } from "../lib/skills";

type Env = {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_CHANNEL_USERNAME: string;
  SITE_URL: string;
};

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
};

const activeStatuses = new Set(["creator", "administrator", "member"]);

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== "POST") return new Response("Telegram webhook is ready.");

    const update = (await request.json()) as TelegramUpdate;
    await handleUpdate(update, env);
    return Response.json({ ok: true });
  },
};

async function handleUpdate(update: TelegramUpdate, env: Env) {
  const callback = update.callback_query;
  if (callback?.data?.startsWith("check:")) {
    const slug = callback.data.slice("check:".length);
    const chatId = callback.message?.chat.id || callback.from.id;
    await answerCallback(env, callback.id, "Checking subscription...");
    await deliverOrAskToJoin(env, chatId, callback.from.id, slug);
    return;
  }

  const message = update.message;
  if (!message?.text || !message.from) return;

  const startMatch = message.text.match(/^\/start(?:\s+(.+))?/);
  if (!startMatch) {
    await sendMessage(env, message.chat.id, "Send /start skill_<slug> or open a skill from Codex Skills.");
    return;
  }

  const payload = startMatch[1] || "";
  if (!payload.startsWith("skill_")) {
    await sendMessage(env, message.chat.id, `Open the catalog: ${env.SITE_URL}`);
    return;
  }

  await deliverOrAskToJoin(env, message.chat.id, message.from.id, payload.slice("skill_".length));
}

async function deliverOrAskToJoin(env: Env, chatId: number, userId: number, slug: string) {
  const skill = getSkill(slug);
  if (!skill) {
    await sendMessage(env, chatId, "Skill not found. Open the catalog and try again.");
    return;
  }

  const subscribed = await isSubscribed(env, userId);
  if (!subscribed) {
    await sendMessage(env, chatId, `Join the channel to get ${skillTitle(skill, "en")}.`, {
      inline_keyboard: [
        [{ text: "Join channel", url: channelUrl(env) }],
        [{ text: "Check subscription", callback_data: `check:${slug}` }],
      ],
    });
    return;
  }

  await sendMessage(env, chatId, [
    `${skill.emoji} *${escapeMarkdown(skillTitle(skill, "en"))}*`,
    escapeMarkdown(skillDescription(skill, "en")),
    "",
    "*Install command*",
    `\`${escapeMarkdown(skill.install)}\``,
    "",
    "Review SKILL.md before running scripts. Use a branch for risky changes.",
  ].join("\n"), undefined, "MarkdownV2");
}

async function isSubscribed(env: Env, userId: number) {
  try {
    const response = await telegram(env, "getChatMember", {
      chat_id: normalizeChannel(env.TELEGRAM_CHANNEL_USERNAME),
      user_id: userId,
    });
    const status = response.result?.status;
    return Boolean(response.ok && status && activeStatuses.has(status));
  } catch {
    return false;
  }
}

async function sendMessage(env: Env, chatId: number, text: string, replyMarkup?: unknown, parseMode?: "MarkdownV2") {
  return telegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

async function answerCallback(env: Env, callbackQueryId: string, text: string) {
  return telegram(env, "answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

async function telegram(env: Env, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json() as Promise<{ ok: boolean; result?: { status?: string } }>;
}

function normalizeChannel(username: string) {
  return username.startsWith("@") ? username : `@${username}`;
}

function channelUrl(env: Env) {
  return `https://t.me/${env.TELEGRAM_CHANNEL_USERNAME.replace(/^@/, "")}`;
}

function escapeMarkdown(value: string) {
  return value.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
