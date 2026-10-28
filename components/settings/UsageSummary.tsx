import { AI_CONFIG } from "@/lib/ai/config";
import { formatNumber } from "@/lib/format";
import type { DailyUsage } from "@/lib/usage";

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number; unit: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatNumber(used)} / {formatNumber(limit)} {unit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        {/* Width is data-driven, so it can't be a static Tailwind class */}
        <div className="h-full rounded-full bg-chart-1" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UsageSummary({ usage }: { usage: DailyUsage }) {
  return (
    <div className="max-w-sm space-y-3">
      <Meter label="Messages" used={usage.chatTurns} limit={AI_CONFIG.limits.chatTurnsPerDay} unit="" />
      <Meter label="Spoken replies" used={usage.ttsCharacters} limit={AI_CONFIG.limits.ttsCharactersPerDay} unit="chars" />
      <p className="text-xs text-muted-foreground">
        {formatNumber(usage.inputTokens + usage.outputTokens)} AI tokens today. Limits reset at midnight UTC.
      </p>
    </div>
  );
}
