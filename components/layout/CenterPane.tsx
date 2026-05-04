'use client';

import { lazy, Suspense } from 'react';
import { useViewStore } from '@/lib/stores/viewStore';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardView = lazy(() => import('@/components/views/DashboardView'));
const GoalPlannerView = lazy(() => import('@/components/views/GoalPlannerView'));

function Loading() {
  return (
    <div className="p-8 space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export default function CenterPane() {
  const mainView = useViewStore((s) => s.mainView);

  return (
    <div className="h-full overflow-y-auto">
      <Suspense fallback={<Loading />}>
        {(mainView === 'dashboard' || mainView === 'session-ledger') && <DashboardView />}
        {mainView === 'goal-planner' && <GoalPlannerView />}
      </Suspense>
    </div>
  );
}
