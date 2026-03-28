"use client";

import { Clock } from "lucide-react";

interface Suggestion {
  type: string;
  rationale: string;
  timeToValue: string;
}

interface Props {
  data: {
    currentPayers: { name: string; type: string }[];
    currentTypes: string[];
    totalUniquePayers: number;
    suggestions: Suggestion[];
  };
}

const TYPE_LABELS: Record<string, string> = {
  insurance: "Insurance",
  "self-pay": "Self-Pay",
  "sliding-scale": "Sliding Scale",
  eap: "EAP",
};

const TYPE_COLORS: Record<string, string> = {
  insurance: "text-blue-400 bg-blue-400/10",
  "self-pay": "text-green-400 bg-green-400/10",
  "sliding-scale": "text-yellow-400 bg-yellow-400/10",
  eap: "text-purple-400 bg-purple-400/10",
};

export default function CaseloadViz({ data }: Props) {
  return (
    <div className="rounded-xl border bg-card p-4 my-1 max-w-[340px] space-y-4">
      {/* Current payers */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-2">
          Your current payers <span className="text-muted-foreground font-normal">({data.totalUniquePayers})</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.currentPayers.map((p) => (
            <span
              key={p.name}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[p.type] ?? "text-muted-foreground bg-muted"}`}
            >
              {p.name}
            </span>
          ))}
          {data.currentPayers.length === 0 && (
            <p className="text-xs text-muted-foreground">No sessions logged yet.</p>
          )}
        </div>
      </div>

      {/* Growth suggestions */}
      <div className="border-t pt-3 space-y-3">
        <p className="text-xs font-semibold text-foreground">Ways to grow</p>
        {data.suggestions.map((s, i) => (
          <div key={i} className="space-y-1">
            <p className="text-xs font-medium text-foreground">{s.type}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.rationale}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Clock className="w-3 h-3 shrink-0" />
              {s.timeToValue}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
