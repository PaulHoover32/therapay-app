import { format, parseISO, startOfYear, endOfYear, eachWeekOfInterval } from "date-fns";
import { weekKey as mondayKey } from "./date-utils";
import { Session } from "./types";

export function buildCumulativeData(sessions: Session[], today: Date) {
  const year = today.getFullYear();
  const yearStart = startOfYear(today);
  const weeks = eachWeekOfInterval({ start: yearStart, end: endOfYear(today) }, { weekStartsOn: 1 });

  const weeklyActual: Record<string, number> = {};
  for (const s of sessions) {
    const key = mondayKey(parseISO(s.session_datetime));
    weeklyActual[key] = (weeklyActual[key] ?? 0) + s.amount;
  }

  const recentKeys = Object.keys(weeklyActual).sort().slice(-4);
  const velocity = recentKeys.reduce((sum, k) => sum + weeklyActual[k], 0) / 4;

  const hasCurrentYearRevenue = sessions.some(
    (s) => parseISO(s.session_datetime).getFullYear() === year,
  );

  const priorYearNum = year - 1;
  const hasPriorYear = sessions.some((s) => parseISO(s.session_datetime).getFullYear() === priorYearNum);
  const priorCumByIndex: Record<number, number> = {};
  if (hasPriorYear) {
    const priorStart = startOfYear(new Date(priorYearNum, 0, 1));
    const priorWeeks = eachWeekOfInterval(
      { start: priorStart, end: endOfYear(new Date(priorYearNum, 0, 1)) },
      { weekStartsOn: 1 },
    );
    let cum = 0;
    for (let i = 0; i < priorWeeks.length; i++) {
      cum += weeklyActual[priorWeeks[i].toISOString().slice(0, 10)] ?? 0;
      priorCumByIndex[i] = cum;
    }
  }

  const data: Array<{ label: string; actual: number | null; projected: number | null; priorYear: number | null }> = [];

  if (!hasCurrentYearRevenue) {
    for (let i = 0; i < weeks.length; i++) {
      data.push({
        label: format(weeks[i], "MMM d"),
        actual: null,
        projected: (i + 1) * velocity,
        priorYear: hasPriorYear ? (priorCumByIndex[i] ?? null) : null,
      });
    }
    return { data, velocity, ytd: 0, projectedAnnual: weeks.length * velocity, hasPriorYear };
  }

  let cumulativeActual = 0;
  let lastActual = 0;
  let projectedWeekCount = 0;

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const key = week.toISOString().slice(0, 10);
    const isPast = week <= today;
    const label = format(week, "MMM d");

    if (isPast) {
      cumulativeActual += weeklyActual[key] ?? 0;
      lastActual = cumulativeActual;
      data.push({ label, actual: cumulativeActual, projected: null, priorYear: hasPriorYear ? (priorCumByIndex[i] ?? null) : null });
    } else {
      projectedWeekCount++;
      data.push({ label, actual: null, projected: lastActual + projectedWeekCount * velocity, priorYear: hasPriorYear ? (priorCumByIndex[i] ?? null) : null });
    }
  }

  const transitionIdx = data.findIndex((d) => d.projected !== null);
  if (transitionIdx > 0) {
    data[transitionIdx - 1] = { ...data[transitionIdx - 1], projected: lastActual };
  }

  return { data, velocity, ytd: lastActual, projectedAnnual: lastActual + projectedWeekCount * velocity, hasPriorYear };
}

export function buildPriorYearWeekly(sessions: Session[], today: Date): Record<number, number> {
  const priorYearNum = today.getFullYear() - 1;
  const priorStart = startOfYear(new Date(priorYearNum, 0, 1));
  const priorWeeks = eachWeekOfInterval(
    { start: priorStart, end: endOfYear(new Date(priorYearNum, 0, 1)) },
    { weekStartsOn: 1 },
  );

  const weeklyRev: Record<string, number> = {};
  for (const s of sessions) {
    const d = parseISO(s.session_datetime);
    if (d.getFullYear() !== priorYearNum) continue;
    const key = mondayKey(d);
    weeklyRev[key] = (weeklyRev[key] ?? 0) + s.amount;
  }

  const result: Record<number, number> = {};
  priorWeeks.forEach((w, i) => {
    result[i] = weeklyRev[w.toISOString().slice(0, 10)] ?? 0;
  });
  return result;
}
