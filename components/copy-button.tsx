"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="copy-action group inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#111] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_12px_30px_rgba(30,35,45,.08)] transition duration-300 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {copied ? (
          <motion.span key="check" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
            <Check size={16} />
          </motion.span>
        ) : (
          <motion.span key="copy" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
            <Copy size={16} />
          </motion.span>
        )}
      </AnimatePresence>
      {copied ? "Copied" : label}
    </button>
  );
}
