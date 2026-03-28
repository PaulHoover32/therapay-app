"use client";

import { useState, useMemo } from "react";
import { parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Session, TherapistProfile } from "@/lib/types";
import AnnualSummaryChart from "./AnnualSummaryChart";
import MonthlyTrendChart from "./MonthlyTrendChart";
import PayerMixChart from "./PayerMixChart";
import { cn } from "@/lib/utils";

interface Props {
  sessions: Session[];
  profile: TherapistProfile;
}

type Metric = "revenue" | "sessions" | "hours";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt$ = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);
const fmtHrs = (v: number) => `${v.toFixed(1)} h`;
const fmtCount = (v: number) => v.toString();

export default function IncomeAnalysis({ sessions }: Props) {
  const years = useMemo(() => {
    const set = new Set(sessions.map((s) => parseISO(s.session_datetime).getFullYear()));
    return [...set].sort();
  }, [sessions]);

  const [metric, setMetric] = useState<Metric>("revenue");
  const [visibleYears, setVisibleYears] = useState<Set<number>>(() => new Set(years));

  const toggleYear = (year: number) =>
    setVisibleYears((prev) => {
      const next = new Set(prev);
      if (next.has(year) && next.size > 1) next.delete(year);
      else next.add(year);
      return next;
    });

  const formatter = metric === "revenue" ? fmt$ : metric === "hours" ? fmtHrs : fmtCount;
  const unit = metric === "revenue" ? "total" : metric === "hours" ? "hrs" : "sessions";

  // ── Annual summary ──
  const annualData = useMemo(() =>
    years.map((year) => {
      const ys = sessions.filter((s) => parseISO(s.session_datetime).getFullYear() === year);
      return {
        year: year.toString(),
        value: metric === "revenue"
          ? ys.reduce((sum, s) => sum + s.amount, 0)
          : metric === "sessions"
            ? ys.length
            : ys.reduce((sum, s) => sum + s.session_duration / 60, 0),
      };
    }),
  [sessions, years, metric]);

  // ── Monthly trend (one key per year) ──
  const monthlyData = useMemo(() =>
    MONTHS.map((month, i) => {
      const row: Record<string, number | string> = { month };
      for (const year of [...visibleYears].sort()) {
        const ms = sessions.filter((s) => {
          const d = parseISO(s.session_datetime);
          return d.getFullYear() === year && d.getMonth() === i;
        });
        row[year.toString()] = metric === "revenue"
          ? ms.reduce((sum, s) => sum + s.amount, 0)
          : metric === "sessions"
            ? ms.length
            : ms.reduce((sum, s) => sum + s.session_duration / 60, 0);
      }
      return row;
    }),
  [sessions, visibleYears, metric]);

  // ── Payer mix ──
  const payerMixData = useMemo(() =>
    years.map((year) => {
      const ys = sessions.filter((s) => parseISO(s.session_datetime).getFullYear() === year);
      const bucket = (opt: string) =>
        ys.filter((s) => s.payment_option === opt).reduce((sum, s) => sum + s.amount, 0);
      return {
        year: year.toString(),
        insurance: bucket("insurance"),
        "self-pay": bucket("self-pay"),
        "sliding-scale": bucket("sliding-scale"),
        eap: bucket("eap"),
      };
    }),
  [sessions, years]);

  // ── YoY growth stat ──
  const yoyGrowth = useMemo(() => {
    if (annualData.length < 2) return null;
    const last = annualData[annualData.length - 1].value;
    const prev = annualData[annualData.length - 2].value;
    if (prev === 0) return null;
    return ((last - prev) / prev) * 100;
  }, [annualData]);

  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No sessions logged yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric selector */}
      <div className="flex items-center gap-1 rounded-md border border-border overflow-hidden w-fit">
        {(["revenue", "sessions", "hours"] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              metric === m
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Annual summary + stat */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Annual Total</CardTitle>
            <CardDescription>
              {metric === "revenue" ? "Total income" : metric === "sessions" ? "Sessions logged" : "Hours worked"} per year
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnnualSummaryChart data={annualData} formatter={formatter} unit={unit} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {annualData.map((d) => (
            <Card key={d.year}>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm text-muted-foreground">{d.year}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatter(d.value)}</p>
                {yoyGrowth !== null && d.year === annualData[annualData.length - 1].year && (
                  <p className={cn("text-xs mt-1", yoyGrowth >= 0 ? "text-green-400" : "text-red-400")}>
                    {yoyGrowth >= 0 ? "+" : ""}{yoyGrowth.toFixed(1)}% vs prior year
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Month-by-month comparison */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Month-by-Month</CardTitle>
              <CardDescription>Compare the same months across years</CardDescription>
            </div>
            {years.length > 1 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={cn(
                      "px-3 py-1 text-xs rounded-full border transition-colors",
                      visibleYears.has(year)
                        ? "bg-primary/20 border-primary/40 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MonthlyTrendChart
            data={monthlyData}
            years={[...visibleYears].sort()}
            formatter={formatter}
          />
        </CardContent>
      </Card>

      {/* Revenue mix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue Mix</CardTitle>
          <CardDescription>Income breakdown by payment type per year</CardDescription>
        </CardHeader>
        <CardContent>
          <PayerMixChart data={payerMixData} formatter={fmt$} />
        </CardContent>
      </Card>
    </div>
  );
}
