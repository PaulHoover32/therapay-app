import type { ThreadSummary } from "@/lib/threads";

const DAY = 24 * 60 * 60 * 1000;

export function groupThreadsByDate(threads: ThreadSummary[], now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets: { label: string; test: (t: number) => boolean }[] = [
    { label: "Today", test: (t) => t >= startOfToday },
    { label: "Yesterday", test: (t) => t >= startOfToday - DAY },
    { label: "Previous 7 days", test: (t) => t >= startOfToday - 7 * DAY },
    { label: "Previous 30 days", test: (t) => t >= startOfToday - 30 * DAY },
    { label: "Older", test: () => true },
  ];
  const groups = buckets.map((b) => ({ label: b.label, items: [] as ThreadSummary[] }));
  for (const thread of threads) {
    const t = new Date(thread.updated_at).getTime();
    groups[buckets.findIndex((b) => b.test(t))].items.push(thread);
  }
  return groups.filter((g) => g.items.length > 0);
}
