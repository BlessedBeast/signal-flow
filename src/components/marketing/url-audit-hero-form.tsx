"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseApiJsonResponse } from "@/lib/api/parse-api-response";
import type { MicroAuditResult } from "@/lib/micro-audit/types";
import { cn } from "@/lib/utils";

type TeaserApiSuccess = {
  ok: true;
  teaser: MicroAuditResult["teaser"];
  dna: MicroAuditResult["dna"];
  previewLeads: MicroAuditResult["previewLeads"];
};

type UrlAuditHeroFormProps = {
  onAuditComplete: (result: MicroAuditResult) => void;
  className?: string;
};

export function UrlAuditHeroForm({
  onAuditComplete,
  className,
}: UrlAuditHeroFormProps) {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Enter your website URL to run the micro-audit.");
      return;
    }

    if (isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/onboard/teaser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const parsed = await parseApiJsonResponse<TeaserApiSuccess>(
        res,
        "MICRO-AUDIT"
      );

      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }

      if (!parsed.data.ok) {
        toast.error("Micro-audit could not complete. Try another URL.");
        return;
      }

      onAuditComplete({
        teaser: parsed.data.teaser,
        dna: parsed.data.dna,
        previewLeads: parsed.data.previewLeads,
      });
    } catch {
      toast.error("Network error — check your connection and retry.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch",
        className
      )}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="url"
          inputMode="url"
          placeholder="Enter your website URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isAnalyzing}
          className="h-12 glass-strong border-border/60 pl-10 text-base shadow-sm"
          aria-label="Website URL"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        disabled={isAnalyzing}
        className="h-12 shrink-0 gap-2 px-6 font-semibold shadow-md"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Analyzing…
          </>
        ) : (
          "Analyze My Distribution Leaks"
        )}
      </Button>
    </form>
  );
}
