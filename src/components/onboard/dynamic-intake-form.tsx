"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/api-auth";

type MirrorContext = {
  brandName: string;
  targetPersona: string;
  coreFriction: string;
  url?: string;
  oneLiner?: string;
};

type DynamicIntakeFormProps = {
  mirror: MirrorContext;
  selectedFrameworkSlugs: string[];
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
};

export function DynamicIntakeForm({
  mirror,
  selectedFrameworkSlugs,
  value,
  onChange,
}: DynamicIntakeFormProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadQuestions() {
      if (selectedFrameworkSlugs.length === 0) {
        setQuestions([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          setError("Sign in to generate dynamic intake questions.");
          return;
        }

        const res = await fetch("/api/onboard/intake-questions", {
          method: "POST",
          headers,
          body: JSON.stringify({
            mirror,
            frameworkSlugs: selectedFrameworkSlugs,
          }),
        });

        const json = (await res.json()) as {
          ok?: boolean;
          questions?: string[];
          error?: string;
        };

        if (!res.ok || !json.ok || !json.questions?.length) {
          setError(json.error ?? "Failed to generate intake questions.");
          return;
        }

        setQuestions(json.questions);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Intake generation failed");
      } finally {
        setLoading(false);
      }
    }

    void loadQuestions();
  }, [mirror, selectedFrameworkSlugs]);

  return (
    <section className="glass rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Dynamic Intake
        </p>
        <h3 className="mt-1 text-base font-semibold text-foreground">
          AI-generated founder context capture
        </h3>
      </div>

      {loading ? (
        <div className="glass-soft flex min-h-[120px] items-center justify-center gap-2 rounded-xl">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Generating framework-specific questions...
          </p>
        </div>
      ) : error ? (
        <div className="glass-soft rounded-xl border border-destructive/35 p-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setQuestions([])}
          >
            Refresh after selecting frameworks
          </Button>
        </div>
      ) : questions.length > 0 ? (
        <div className="space-y-4">
          {questions.map((question, index) => {
            const key = `q${index + 1}`;
            return (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-sm text-foreground">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Q{index + 1}
                  </span>{" "}
                  {question}
                </Label>
                <Textarea
                  id={key}
                  value={value[key] ?? ""}
                  onChange={(e) => onChange({ ...value, [key]: e.target.value })}
                  className="min-h-[84px] glass-soft resize-y"
                  placeholder="Add precise founder context..."
                />
              </div>
            );
          })}
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              <Sparkles className="mr-1 inline size-3.5" aria-hidden />
              These answers become your persona context and are injected into AI
              generation prompts.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Select at least one framework to generate dynamic intake questions.
        </p>
      )}
    </section>
  );
}

