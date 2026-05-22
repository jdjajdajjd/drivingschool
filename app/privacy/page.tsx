import type { Metadata } from "next";
import { SimplePage, TextStack } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy notes for Codex Skills.",
};

export default function PrivacyPage() {
  return (
    <SimplePage eyebrow="Privacy" title="Simple privacy notes." summary="Codex Skills is a static catalog MVP with no account system.">
      <TextStack>
        <p>This version does not include user accounts, payments, or a backend database for visitors. Basic hosting logs may be processed by Cloudflare Pages as part of serving the site.</p>
        <h2>Clipboard actions</h2>
        <p>Copy buttons only write the selected install command to your clipboard after you click them.</p>
        <h2>External links</h2>
        <p>Telegram, source links, and future skill repositories are external destinations. Their own privacy practices apply once you leave this site.</p>
      </TextStack>
    </SimplePage>
  );
}
