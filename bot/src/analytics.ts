import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type AnalyticsEvent = {
  type: "skill_request" | "subscription_block" | "skill_delivered" | "language_set" | "pack_prompt";
  userId: number;
  username?: string;
  skillSlug?: string;
  subscribed?: boolean;
  language?: "en" | "ru";
  date: string;
};

export type BotState = {
  events: AnalyticsEvent[];
  users: Record<string, { language: "en" | "ru"; updatedAt: string }>;
};

const emptyState: BotState = { events: [], users: {} };

export class JsonAnalyticsStore {
  constructor(private readonly filePath: string) {}

  async track(event: Omit<AnalyticsEvent, "date">) {
    const state = await this.read();
    state.events.push({ ...event, date: new Date().toISOString() });
    await this.write(state);
  }

  async setLanguage(userId: number, language: "en" | "ru") {
    const state = await this.read();
    state.users[String(userId)] = { language, updatedAt: new Date().toISOString() };
    state.events.push({ type: "language_set", userId, language, date: new Date().toISOString() });
    await this.write(state);
  }

  async getLanguage(userId: number) {
    const state = await this.read();
    return state.users[String(userId)]?.language;
  }

  private async read(): Promise<BotState> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as BotState;
    } catch {
      return structuredClone(emptyState);
    }
  }

  private async write(state: BotState) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}
