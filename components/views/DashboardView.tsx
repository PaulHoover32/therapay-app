'use client';

import { useEffect, useState } from 'react';
import Dashboard from '@/components/Dashboard';
import { Session, TherapistProfile, ReferencePayer, ReferenceSessionCode, Goal } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Skeleton } from '@/components/ui/skeleton';

function enrich(
  sessions: Record<string, unknown>[],
  sessionCodes: ReferenceSessionCode[],
  payers: ReferencePayer[],
): Session[] {
  return sessions.map((s) => {
    const code = sessionCodes.find((c) => c.code === s.session_code);
    const payerRef = payers.find((p) => p.name === s.payer);
    return {
      ...s,
      appointment_type: code?.appointment_type ?? 'individual',
      session_duration: code?.session_duration ?? 0,
      payment_option: payerRef?.payment_option ?? 'insurance',
    } as unknown as Session;
  });
}

export default function DashboardView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    sessions: Session[];
    profile: TherapistProfile;
    payers: ReferencePayer[];
    sessionCodes: ReferenceSessionCode[];
    activeGoal: Goal | null;
  } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: therapist } = await supabase
          .from('therapists')
          .select('id, name, avg_session_duration, license_type, specialties')
          .eq('user_id', user.id)
          .single();

        if (!therapist) return;

        const [{ data: sessions }, { data: payers }, { data: sessionCodes }, { data: goal }] =
          await Promise.all([
            supabase
              .from('sessions')
              .select('id, created_at, updated_at, session_datetime, amount, session_code, state, payer')
              .eq('therapist_id', therapist.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('reference_payers')
              .select('id, name, payment_option')
              .eq('active', true)
              .order('sort_order'),
            supabase
              .from('reference_session_codes')
              .select('code, appointment_type, session_duration, description')
              .eq('active', true)
              .order('code'),
            supabase
              .from('goals')
              .select('*')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .maybeSingle(),
          ]);

        const payersList = (payers ?? []) as ReferencePayer[];
        const codesList = (sessionCodes ?? []) as ReferenceSessionCode[];

        setData({
          sessions: enrich(
            (sessions ?? []) as Record<string, unknown>[],
            codesList,
            payersList,
          ),
          profile: therapist as unknown as TherapistProfile,
          payers: payersList,
          sessionCodes: codesList,
          activeGoal: (goal as Goal) ?? null,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <Dashboard
        initialSessions={data.sessions}
        profile={data.profile}
        payers={data.payers}
        sessionCodes={data.sessionCodes}
        activeGoal={data.activeGoal}
      />
    </div>
  );
}
