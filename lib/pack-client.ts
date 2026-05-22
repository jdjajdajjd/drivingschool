import { siteConfig, telegramBotUrl } from "@/lib/site-config";
import type { Locale } from "@/lib/skills";

export type CreatePackInput = {
  slugs: string[];
  language: Locale;
  source: string;
};

export type CreatedPack = {
  packId: string;
  slugs: string[];
  createdAt: string;
  expiresAt?: string;
};

export async function createPack(input: CreatePackInput): Promise<CreatedPack> {
  const response = await fetch(`${siteConfig.packStorageUrl}/api/packs`, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(input),
  });

  const payload = await response.json().catch(() => undefined) as CreatedPack | { error?: string } | undefined;
  if (!response.ok || !payload || !("packId" in payload)) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "Pack creation failed");
  }

  return payload;
}

export function telegramPackUrl(packId: string) {
  return telegramBotUrl(`pack_${packId}`);
}
