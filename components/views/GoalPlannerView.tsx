'use client';

import { useEffect, useState } from 'react';
import GoalCard from '@/components/planner/GoalCard';
import RecommendationList from '@/components/planner/RecommendationList';
import { Goal, Recommendation } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

export default function GoalPlannerView() {
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [{ data: goalData }, { data: recData }] = await Promise.all([
          supabase
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle(),
          supabase
            .from('recommendations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        setGoal((goalData as Goal) ?? null);
        setRecommendations((recData ?? []) as Recommendation[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Planner</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your income goals and view AI recommendations.
        </p>
      </div>
      <GoalCard goal={goal} />
      <section className="space-y-4">
        <h2 className="text-base font-semibold">AI Recommendation History</h2>
        <RecommendationList recommendations={recommendations} currentGoal={goal} />
      </section>
    </div>
  );
}
