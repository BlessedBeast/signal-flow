"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type UrlAuditHeroFormProps = {
  onSubmitUrl: (url: string) => void;
  className?: string;
};

export function UrlAuditHeroForm({
  onSubmitUrl,
  className,
}: UrlAuditHeroFormProps) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Enter your website URL to run the forensic audit.");
      return;
    }

    onSubmitUrl(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
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
          placeholder="yourstartup.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="h-12 glass-strong border-border/60 pl-10 text-base shadow-sm"
          aria-label="Website URL"
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="h-12 shrink-0 gap-2 px-6 font-semibold shadow-md"
      >
        Analyze my distribution →
      </Button>
    </form>
  );
}
