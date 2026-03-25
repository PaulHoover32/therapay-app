import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getActiveGoal, getRecommendations } from "@/lib/data";
import GoalCard from "@/components/planner/GoalCard";
import RecommendationList from "@/components/planner/RecommendationList";

export default async function PlannerPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [goal, recommendations] = await Promise.all([
    user ? getActiveGoal(supabase, user.id) : Promise.resolve(null),
    user ? getRecommendations(supabase, user.id) : Promise.resolve([]),
  ]);

  return (
    <div className="p-8 space-y-8 max-w-3xl">
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
