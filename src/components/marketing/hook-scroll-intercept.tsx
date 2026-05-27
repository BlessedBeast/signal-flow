"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type HookScrollInterceptProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
};

export function HookScrollIntercept({
  open,
  onClose,
  onSubmit,
}: HookScrollInterceptProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setUrl("");
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-[90] flex justify-center p-4 sm:p-6"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hook-intercept-title"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 rounded-lg p-2 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
            <p
              id="hook-intercept-title"
              className="pr-10 text-sm font-semibold leading-snug text-foreground"
            >
              Run a Free Forensic Organic Traffic Audit on your product URL
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              One public scan per day · no account required
            </p>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                placeholder="https://yourproduct.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 border-white/[0.12] bg-background/60"
                required
              />
              <Button type="submit" className="gap-2 shrink-0">
                Run audit
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </form>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
