import type { Metadata } from "next";
import { SimplePage, TextStack } from "@/components/simple-page";

export const metadata: Metadata = {
  title: "Terms / Disclaimer",
  description: "Terms and disclaimer for Codex Skills.",
};

export default function TermsPage() {
  return (
    <SimplePage eyebrow="Terms / Disclaimer" title="Use skills with review." summary="Codex Skills is a curated catalog, not a guarantee that every workflow fits every codebase.">
      <TextStack>
        <p>Skills can change files, run tools, or guide agents through complex work. Review instructions and commands before using them in sensitive projects.</p>
        <h2>No warranty</h2>
        <p>The catalog is provided as-is. Test workflows in your own environment and verify results before shipping.</p>
        <h2>Security</h2>
        <p>Do not paste secrets into untrusted tools or repositories. Prefer inspectable sources and keep agent permissions scoped to the task.</p>
      </TextStack>
    </SimplePage>
  );
}
