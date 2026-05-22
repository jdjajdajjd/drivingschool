"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label = "Copy", copiedLabel = "Copied to clipboard", onCopied }: { value: string; label?: string; copiedLabel?: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    onCopied?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="relative inline-flex">
      <motion.button
        type="button"
        onClick={copy}
        whileTap={{ scale: 0.985 }}
        className="copy-action shine-layer group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#111] shadow-[inset_0_1px_0_rgba(255,255,255,.8),0_12px_30px_rgba(30,35,45,.08)] transition duration-300 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8fb7ff]/50"
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
      </motion.button>
      <AnimatePresence>
        {copied && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-none absolute -top-11 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-black/10 bg-white/88 px-3 py-2 text-xs font-bold text-[#5f6470] shadow-[0_18px_45px_rgba(30,35,45,.1)] backdrop-blur-xl"
          >
            {copiedLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
