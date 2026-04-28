import { parseISO, subDays } from "date-fns";
import { Session, Goal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  sessions: Session[];
  activeGoal: Goal | null;
  effectiveToday: Date;
}

function computeMetrics(sessions: Session[], effectiveToday: Date) {
  const year = effectiveToday.getFullYear();

  const ytdRevenue = sessions
    .filter((s) => parseISO(s.session_datetime).getFullYear() === year)
    .reduce((sum, s) => sum + s.amount, 0);

  // 4-week velocity — same bucketing logic as EarningsChart buildCumulativeData
  const weeklyActual: Record<string, number> = {};
  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().slice(0, 10);
    weeklyActual[key] = (weeklyActual[key] ?? 0) + s.amount;
  }
  const recentKeys = Object.keys(weeklyActual).sort().slice(-4);
  const velocity =
    recentKeys.length > 0
      ? recentKeys.reduce((sum, k) => sum + weeklyActual[k], 0) / 4
      : 0;

  const endOfYear = new Date(year, 11, 31);
  const weeksRemaining = Math.max(
    0,
    Math.round((endOfYear.getTime() - effectiveToday.getTime()) / (7 * 24 * 60 * 60 * 1000))
  );
  const projectedAnnual = ytdRevenue + velocity * weeksRemaining;

  // Rolling 28-day metrics
  const cutoff = subDays(effectiveToday, 28);
  const recent28 = sessions.filter((s) => parseISO(s.session_datetime) >= cutoff);
  const hoursPerWeek = recent28.reduce((sum, s) => sum + s.session_duration, 0) / 60 / 4;
  const avgPayout =
    recent28.length > 0 ? recent28.reduce((sum, s) => sum + s.amount, 0) / recent28.length : 0;

  return { ytdRevenue, projectedAnnual, hoursPerWeek, avgPayout };
}

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);

const fmtK = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : fmtCurrency(v);

function progressColor(pct: number) {
  if (pct >= 100) return "bg-green-500";
  if (pct >= 75) return "bg-amber-500";
  return "bg-red-500";
}

function StatBlock({
  label,
  primary,
  secondary,
  sublabel,
  pct,
  goalLabel,
}: {
  label: string;
  primary: string;
  secondary?: string;
  sublabel: string;
  pct: number | null;
  goalLabel: string | null;
}) {
  return (
    <div className="px-6 py-5 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div>
        <p className="text-2xl font-bold">{primary}</p>
        {secondary && <p className="text-sm text-muted-foreground mt-0.5">{secondary}</p>}
      </div>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
      {pct !== null && goalLabel && (
        <div className="space-y-1 pt-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all [width:var(--bar-pct)]", progressColor(pct))}
              style={{ "--bar-pct": `${Math.min(pct, 100)}%` } as React.CSSProperties}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {Math.round(pct)}% of {goalLabel}
          </p>
        </div>
      )}
    </div>
  );
}

export default function GoalsOverview({ sessions, activeGoal, effectiveToday }: Props) {
  const { ytdRevenue, projectedAnnual, hoursPerWeek, avgPayout } = computeMetrics(
    sessions,
    effectiveToday
  );

  const annualGoal = activeGoal?.annual_income_target ?? null;
  const hoursGoal = activeGoal?.target_weekly_hours ?? null;
  const payoutGoal = activeGoal?.target_avg_payout ?? null;

  const incomePct = annualGoal ? (projectedAnnual / annualGoal) * 100 : null;
  const hoursPct = hoursGoal && hoursPerWeek > 0 ? (hoursPerWeek / hoursGoal) * 100 : null;
  const payoutPct = payoutGoal && avgPayout > 0 ? (avgPayout / payoutGoal) * 100 : null;

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Goals vs. Actuals
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <StatBlock
            label="Annual Income"
            primary={fmtCurrency(ytdRevenue)}
            secondary={`Projecting ${fmtK(projectedAnnual)}`}
            sublabel="YTD actual + projection"
            pct={incomePct}
            goalLabel={annualGoal ? fmtCurrency(annualGoal) + " goal" : null}
          />
          <StatBlock
            label="Hours / Week"
            primary={`${hoursPerWeek.toFixed(1)} hrs`}
            sublabel="28-day rolling avg"
            pct={hoursPct}
            goalLabel={hoursGoal ? `${hoursGoal.toFixed(1)} hrs goal` : null}
          />
          <StatBlock
            label="Avg Payout / Session"
            primary={fmtCurrency(avgPayout)}
            sublabel="28-day rolling avg"
            pct={payoutPct}
            goalLabel={payoutGoal ? `${fmtCurrency(payoutGoal)} goal` : null}
          />
        </div>
        {!activeGoal && (
          <p className="text-xs text-muted-foreground px-6 pb-4">
            Chat with the Therapay Assistant to set goals and see progress.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
