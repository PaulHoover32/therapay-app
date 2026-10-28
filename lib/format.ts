const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCurrency(value: number | null | undefined, cents = false): string {
  if (value == null || Number.isNaN(value)) return "—";
  return (cents ? usd2 : usd0).format(value);
}

// Compact axis labels: $1.2k, $15k
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return `$${Math.round(value)}`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatPercentChange(current: number, previous: number): string | null {
  if (!previous) return null;
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

// Dates in the analytics DB are plain YYYY-MM-DD; parse as local, not UTC
export function parseDay(day: string): Date {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return parseDay(day).toLocaleDateString("en-US", opts);
}
