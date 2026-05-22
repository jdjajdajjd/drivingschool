import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { skills, type Locale } from "../../lib/skills";
import type { StoredPack } from "../../lib/prompt-builder";

type PackState = { packs: Record<string, StoredPack> };
const emptyState: PackState = { packs: {} };
const allowedSlugs = new Set(skills.map((skill) => skill.slug));
const maxSkills = 12;
const ttlMs = 30 * 24 * 60 * 60 * 1000;

export class JsonPackStore {
  constructor(private readonly filePath: string) {}

  async create(input: { slugs: string[]; language?: Locale; source?: string }) {
    const slugs = Array.from(new Set(input.slugs.filter((slug) => allowedSlugs.has(slug))));
    if (!slugs.length) throw new PackError("No skills selected", 400);
    if (slugs.length > maxSkills) throw new PackError("Too many skills selected", 400);

    const state = await this.read();
    this.prune(state);
    const now = new Date();
    const pack: StoredPack = {
      packId: this.makePackId(state),
      slugs,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      language: input.language === "ru" ? "ru" : "en",
      source: input.source || "catalog",
    };
    state.packs[pack.packId] = pack;
    await this.write(state);
    return pack;
  }

  async get(packId: string) {
    const state = await this.read();
    this.prune(state);
    await this.write(state);
    return state.packs[packId];
  }

  private makePackId(state: PackState) {
    for (let index = 0; index < 8; index += 1) {
      const id = `pk_${Math.random().toString(36).slice(2, 8)}`;
      if (!state.packs[id]) return id;
    }
    return `pk_${Date.now().toString(36).slice(-6)}`;
  }

  private prune(state: PackState) {
    const now = Date.now();
    for (const [id, pack] of Object.entries(state.packs)) {
      if (pack.expiresAt && new Date(pack.expiresAt).getTime() < now) delete state.packs[id];
    }
  }

  private async read(): Promise<PackState> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as PackState;
    } catch {
      return structuredClone(emptyState);
    }
  }

  private async write(state: PackState) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(state, null, 2)}\n`);
  }
}

export class PackError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message);
  }
}

export function startPackServer(store: JsonPackStore, port: number) {
  const server = createServer(async (request, response) => {
    try {
      await handleRequest(store, request, response);
    } catch (error) {
      const status = error instanceof PackError ? error.status : 500;
      sendJson(response, status, { error: error instanceof Error ? error.message : "Pack creation failed" });
    }
  });
  server.listen(port, "127.0.0.1", () => console.log(`Pack API is running on 127.0.0.1:${port}`));
  return server;
}

async function handleRequest(store: JsonPackStore, request: IncomingMessage, response: ServerResponse) {
  setCors(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url || "/", "http://127.0.0.1");
  if (request.method === "POST" && url.pathname === "/api/packs") {
    const input = await readJson(request) as { slugs?: string[]; language?: Locale; source?: string };
    sendJson(response, 200, await store.create({ slugs: input.slugs || [], language: input.language, source: input.source }));
    return;
  }

  const match = url.pathname.match(/^\/api\/packs\/(pk_[a-z0-9]{6,12})$/);
  if (request.method === "GET" && match) {
    const pack = await store.get(match[1]);
    if (!pack) throw new PackError("Pack not found or expired.", 404);
    sendJson(response, 200, pack);
    return;
  }

  sendJson(response, 200, { ok: true, service: "Codex Skills Pack API" });
}

async function readJson(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  setCors(response);
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function setCors(response: ServerResponse) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type,bypass-tunnel-reminder");
}
