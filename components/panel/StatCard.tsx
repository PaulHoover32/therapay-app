import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  detail?: string | null;
  tone?: "default" | "up" | "down";
}

export default function StatCard({ label, value, detail, tone = "default" }: Props) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {detail && (
        <p
          className={cn(
            "mt-0.5 text-xs text-muted-foreground",
            tone === "up" && "text-emerald-600 dark:text-emerald-400",
            tone === "down" && "text-rose-600 dark:text-rose-400"
          )}
        >
          {detail}
        </p>
      )}
    </div>
  );
}
