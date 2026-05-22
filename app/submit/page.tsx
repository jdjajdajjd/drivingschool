import type { Metadata } from "next";
import { CopyButton } from "@/components/copy-button";
import { SimplePage, TextStack } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "Submit Skill",
  description: "Submit a practical skill for Codex Skills.",
};

export default function SubmitPage() {
  return (
    <SimplePage eyebrow="Submit Skill" title="Send a useful workflow." summary="Submissions should be practical, inspectable, and easy to adapt.">
      <TextStack>
        <p>Good skills solve a narrow problem clearly. They should explain when to use them, what files or tools they touch, and any setup needed before running.</p>
        <h2>Submission checklist</h2>
        <ul>
          <li>Clear title and short summary.</li>
          <li>Compatibility notes for Codex, ChatGPT, Claude, or local agents.</li>
          <li>Install or copy command.</li>
          <li>Examples and practical use cases.</li>
          <li>Source link or repository path.</li>
        </ul>
        <div className="mt-8 rounded-[26px] bg-[#111] p-4 text-white">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-white/52">Command</p>
          <code className="block overflow-x-auto whitespace-nowrap rounded-2xl bg-white/8 px-4 py-3 text-sm text-white/92">codex skills submit ./my-skill</code>
          <div className="mt-4"><CopyButton value="codex skills submit ./my-skill" label="Copy command" /></div>
        </div>
      </TextStack>
    </SimplePage>
  );
}
