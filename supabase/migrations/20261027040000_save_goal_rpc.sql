-- Atomically record a recommendation and make it the active goal for its year.
-- SECURITY INVOKER: runs as the calling user, so RLS still applies to every statement.
create or replace function public.save_goal_recommendation(
  p_goal_year integer,
  p_annual_income_target numeric,
  p_target_weekly_hours numeric,
  p_target_avg_payout numeric,
  p_summary text,
  p_reasoning text,
  p_ytd_revenue_at_time numeric,
  p_avg_weekly_hours_at_time numeric,
  p_avg_payout_at_time numeric,
  p_weeks_remaining_at_input integer
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_rec_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.recommendations (
    user_id, goal_year, annual_income_target, target_weekly_hours, target_avg_payout,
    summary, reasoning, ytd_revenue_at_time, avg_weekly_hours_at_time, avg_payout_at_time, weeks_remaining_at_input
  ) values (
    v_user, p_goal_year, p_annual_income_target, p_target_weekly_hours, p_target_avg_payout,
    p_summary, p_reasoning, p_ytd_revenue_at_time, p_avg_weekly_hours_at_time, p_avg_payout_at_time, p_weeks_remaining_at_input
  ) returning id into v_rec_id;

  update public.goals set is_active = false
  where user_id = v_user and goal_year = p_goal_year and is_active;

  insert into public.goals (
    user_id, goal_year, annual_income_target, target_weekly_hours, target_avg_payout,
    is_active, last_modified_by, last_modified_at
  ) values (
    v_user, p_goal_year, p_annual_income_target, p_target_weekly_hours, p_target_avg_payout,
    true, 'ai', now()
  );

  update public.therapists set onboarding_completed_at = now()
  where user_id = v_user and onboarding_completed_at is null;

  return v_rec_id;
end;
$$;

revoke execute on function public.save_goal_recommendation from public, anon;
grant execute on function public.save_goal_recommendation to authenticated;
