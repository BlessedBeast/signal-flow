"use client";

import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ListCardProps = {
  title: string;
  description?: string;
  items: string[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  emptyMessage?: string;
  /** Apply mono styling to item badges (Serper operators). */
  monoItems?: boolean;
  disabled?: boolean;
};

export function ListCard({
  title,
  description,
  items,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  placeholder = "Add item",
  emptyMessage = "No items yet.",
  monoItems = false,
  disabled = false,
}: ListCardProps) {
  return (
    <section className="rounded-xl glass p-5 space-y-4">
      <div>
        <h3 className="font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          items.map((item, index) => (
            <Badge
              key={`${item}-${index}`}
              variant="secondary"
              className={cn(
                "gap-1.5 pr-1 font-normal",
                monoItems && "font-mono text-xs"
              )}
            >
              <span className="max-w-[280px] truncate">{item}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemove(index)}
                className="rounded-full p-0.5 hover:bg-muted disabled:opacity-50"
                aria-label={`Remove ${item}`}
              >
                <X className="size-3 shrink-0" aria-hidden />
              </button>
            </Badge>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(monoItems && "font-mono text-xs")}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={disabled}
          onClick={onAdd}
        >
          Add
        </Button>
      </div>
    </section>
  );
}
