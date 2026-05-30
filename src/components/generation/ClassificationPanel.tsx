import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ClassificationItem } from "@/lib/ai/classification";
import { cn } from "@/lib/utils";

const VISIBILITY_LABELS: Record<ClassificationItem["visibility"], string> = {
  player_facing: "Player-facing",
  internal: "Internal",
  unclear: "Unclear",
};

interface ClassificationPanelProps {
  items: ClassificationItem[];
  outputLanguage?: "pl" | "en" | null;
}

export default function ClassificationPanel({ items, outputLanguage }: ClassificationPanelProps) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-blue-100/90"
        aria-expanded={open}
      >
        <span>
          Classification ({items.length} item{items.length === 1 ? "" : "s"})
          {outputLanguage ? ` · ${outputLanguage.toUpperCase()}` : ""}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <ul className="space-y-3 border-t border-white/10 px-4 py-3">
          {items.map((item, index) => (
            <li key={`${item.source}-${String(index)}`} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-medium text-white">{item.source}</p>
              <p className="mt-1 text-xs text-blue-100/60">
                {item.classification.replaceAll("_", " ")} · {VISIBILITY_LABELS[item.visibility]}
              </p>
              <p className="mt-2 text-sm text-blue-100/80">{item.suggested_public_summary}</p>
              <p className="mt-2 text-xs text-blue-100/50">{item.reason}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
