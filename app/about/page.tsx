import type { Metadata } from "next";
import { SimplePage, TextStack } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "About",
  description: "About Codex Skills, a curated catalog of practical workflows for coding agents.",
};

export default function AboutPage() {
  return (
    <SimplePage eyebrow="About" title="A careful catalog for agent workflows." summary="Codex Skills collects practical skills for Codex, ChatGPT, Claude, and AI coding agents.">
      <TextStack>
        <p>Codex Skills is built as a working catalog, not a generic tools directory. Each entry is selected for clear use, readable setup, and practical value in day-to-day engineering work.</p>
        <h2>What belongs here</h2>
        <p>Skills that help agents design, build, test, document, research, deploy, or review software with less friction. Short instructions, inspectable sources, and calm defaults matter more than novelty.</p>
        <h2>Brand tone</h2>
        <p>Useful skills, selected carefully. Browse, install, adapt.</p>
      </TextStack>
    </SimplePage>
  );
}
