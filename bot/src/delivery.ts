import { InputFile, type Context, type InlineKeyboard } from "grammy";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Locale, Skill } from "../../lib/skills";
import { skillMessage } from "./messages";

export type DeliveryContext = {
  ctx: Context;
  skill: Skill;
  locale: Locale;
  keyboard?: InlineKeyboard;
};

export async function deliverSkill({ ctx, skill, locale, keyboard }: DeliveryContext) {
  await ctx.reply(skillMessage(skill, locale), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: keyboard,
  });

  const localSkillMd = `skills/${skill.slug}/SKILL.md`;
  if (existsSync(localSkillMd)) {
    await sendSkillMarkdown(ctx, localSkillMd, `${skill.slug}-SKILL.md`);
  }
}

async function sendSkillMarkdown(ctx: Context, path: string, filename: string) {
  const content = await readFile(path);
  await ctx.replyWithDocument(new InputFile(content, filename), {
    caption: "SKILL.md",
  });
}
