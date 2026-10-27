import { Skeleton } from "@/components/ui/skeleton";

// Loading / error / empty placeholder shared by panel views
export default function PanelState({ loading, error, empty }: { loading?: boolean; error?: string | null; empty?: string }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-destructive">Couldn&apos;t load this view: {error}</p>;
  if (empty) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return null;
}
