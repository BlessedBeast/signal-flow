"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type MarkdownDraftCanvasProps = {
  content: string;
  className?: string;
};

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function renderBlock(block: string, index: number): ReactNode {
  const trimmed = block.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("### ")) {
    return (
      <h3
        key={index}
        className="text-base font-semibold tracking-tight text-foreground"
      >
        {trimmed.slice(4)}
      </h3>
    );
  }

  if (trimmed.startsWith("## ")) {
    return (
      <h2
        key={index}
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        {trimmed.slice(3)}
      </h2>
    );
  }

  if (trimmed.startsWith("# ")) {
    return (
      <h1
        key={index}
        className="text-xl font-semibold tracking-tight text-foreground"
      >
        {trimmed.slice(2)}
      </h1>
    );
  }

  const lines = trimmed.split("\n");
  const isBulletList = lines.every(
    (line) => line.trim() === "" || /^[-*]\s+/.test(line.trim())
  );

  if (isBulletList && lines.some((line) => /^[-*]\s+/.test(line.trim()))) {
    return (
      <ul
        key={index}
        className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/95"
      >
        {lines
          .filter((line) => /^[-*]\s+/.test(line.trim()))
          .map((line, lineIndex) => (
            <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s+/, ""))}</li>
          ))}
      </ul>
    );
  }

  return (
    <p
      key={index}
      className="text-sm leading-7 text-foreground/95 [&:not(:first-child)]:mt-0"
    >
      {renderInline(trimmed)}
    </p>
  );
}

export function MarkdownDraftCanvas({
  content,
  className,
}: MarkdownDraftCanvasProps) {
  const blocks = content.split(/\n\n+/);

  return (
    <article
      className={cn(
        "max-w-none space-y-4 text-foreground",
        className
      )}
    >
      {blocks.map((block, index) => renderBlock(block, index))}
    </article>
  );
}
