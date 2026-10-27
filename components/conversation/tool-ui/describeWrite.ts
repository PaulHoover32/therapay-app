import { formatCurrency, formatDay } from "@/lib/format";
import type { WriteTool } from "@/lib/ai/write-tools";

type Input = Record<string, unknown> | undefined;
type Row = [label: string, value: string];

const str = (v: unknown) => (v == null || v === "" ? "—" : String(v));
const money = (v: unknown) => (typeof v === "number" ? formatCurrency(v, true) : str(v));
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v) ? formatDay(v, { month: "short", day: "numeric", year: "numeric" }) : str(v));

function sessionRows(s: Record<string, unknown>): Row[] {
  return [
    ["Date", day(s.session_datetime)],
    ["Payer", str(s.payer)],
    ["Code", str(s.session_code)],
    ["State", str(s.state)],
    ["Amount", money(s.amount)],
  ];
}

// Title and the exact fields a write will save, for the confirmation card
export function describeWrite(tool: WriteTool, input: Input): { title: string; rows: Row[]; note?: string } {
  const i = input ?? {};
  switch (tool) {
    case "logSession":
      return { title: "Log this session?", rows: sessionRows(i) };
    case "editSession": {
      const changes = (i.changes ?? {}) as Record<string, unknown>;
      return { title: "Update this session?", rows: sessionRows(changes).filter(([, v]) => v !== "—") };
    }
    case "deleteSession":
      return { title: "Delete this session?", rows: [["Session", str(i.summary)]], note: "This can't be undone." };
    case "bulkInsertSessions": {
      const sessions = (i.sessions ?? []) as Record<string, unknown>[];
      const total = sessions.reduce((n, s) => n + (typeof s.amount === "number" ? s.amount : 0), 0);
      const dates = sessions.map((s) => String(s.session_datetime ?? "")).filter(Boolean).sort();
      return {
        title: `Import ${sessions.length} sessions?`,
        rows: [
          ["Sessions", String(sessions.length)],
          ["Date range", dates.length ? `${day(dates[0])} – ${day(dates[dates.length - 1])}` : "—"],
          ["Total", money(total)],
        ],
      };
    }
    case "saveGoals":
      return {
        title: `Set your ${str(i.goal_year)} goal?`,
        rows: [
          ["Annual income", money(i.annual_income_target)],
          ["Hours / week", str(i.target_weekly_hours)],
          ["Avg payout", money(i.target_avg_payout)],
        ],
        note: typeof i.summary === "string" ? i.summary : undefined,
      };
    case "updatePracticeInfo":
      return {
        title: "Update your practice profile?",
        rows: (
          [
            ["License", i.license_type],
            ["Specialties", i.specialties],
            ["Years licensed", i.years_licensed],
            ["Practice model", i.practice_model],
            ["States", Array.isArray(i.states) ? i.states.join(", ") : undefined],
          ] as [string, unknown][]
        )
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, str(v)] as Row),
      };
    case "sendPasswordReset":
      return { title: "Email you a password reset link?", rows: [] };
  }
}
