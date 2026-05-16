import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PLAN_LENGTHS } from "@/lib/ielts";
import { CalendarDays, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/study-plan")({ component: StudyPlanPage });

interface PlanDay { day: number; focus: string; minutes: number; tasks: { label: string; route?: string }[] }
interface Plan { length_days: number; daily_minutes: number; days: PlanDay[]; tip?: string }

function StudyPlanPage() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [length, setLength] = useState<number>(15);
  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p);
      setLength(p?.plan_length ?? 15);
      const { data: existing } = await supabase
        .from("study_plans").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (existing) setPlan(existing.plan as unknown as Plan);
    })();
  }, [user]);

  async function generate() {
    if (!user) return;
    setLoading(true);
    const r = await ai({
      data: {
        task: "mock_report",
        payload: {
          mode: "study_plan",
          length_days: length,
          daily_minutes: profile?.daily_minutes ?? 30,
          target_band: profile?.target_band ?? 7,
          current_band: profile?.current_band ?? 5.5,
          weakest_skill: profile?.weakest_skill ?? "Writing",
          instructions: `Generate JSON: { length_days, daily_minutes, days: [{day, focus, minutes, tasks: [{label, route}]}], tip }. Use these route slugs: /practice/listening, /practice/reading, /practice/writing-task1, /practice/writing-task2, /practice/speaking, /practice/grammar, /practice/vocabulary, /mock. Mix skills, weight weakest_skill 40%. Include weekly mock exam.`,
        },
      },
    });
    if (r.error || !r.result) { toast.error(r.error ?? "Failed"); setLoading(false); return; }
    const p = r.result as Plan;
    setPlan(p);
    await supabase.from("study_plans").insert({ user_id: user.id, length_days: length, plan: p as any });
    setLoading(false);
  }

  return (
    <div>
      <PageHeader title="Study Plan" subtitle={`Personalised • ${profile?.daily_minutes ?? 30} min/day`} back="/dashboard" />

      <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground">
        <p className="text-xs uppercase opacity-80 tracking-wide">Plan length</p>
        <div className="mt-3 flex gap-2">
          {PLAN_LENGTHS.map((d) => (
            <button key={d} onClick={() => setLength(d)}
              className={`flex-1 h-10 rounded-lg text-sm font-medium border transition ${length === d ? "bg-white text-primary border-white" : "border-white/30"}`}>
              {d} days
            </button>
          ))}
        </div>
        <button disabled={loading} onClick={generate}
          className="mt-4 h-11 w-full rounded-xl bg-gold text-gold-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> {plan ? "Regenerate plan" : "Generate plan"}</>}
        </button>
      </section>

      {plan?.tip && (
        <p className="mt-4 text-xs italic text-muted-foreground border-l-2 border-gold pl-3">{plan.tip}</p>
      )}

      {plan && (
        <section className="mt-4 space-y-2">
          {plan.days?.map((d) => (
            <div key={d.day} className={`rounded-2xl border p-3 ${done[d.day] ? "bg-success/5 border-success/30" : "bg-card border-border"}`}>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold flex-1">Day {d.day} — {d.focus}</p>
                <span className="text-[11px] text-muted-foreground">{d.minutes}m</span>
                <button onClick={() => setDone((x) => ({ ...x, [d.day]: !x[d.day] }))}>
                  <CheckCircle2 className={`h-5 w-5 ${done[d.day] ? "text-success fill-success/20" : "text-muted-foreground"}`} />
                </button>
              </div>
              <ul className="mt-2 space-y-1">
                {d.tasks?.map((t, i) => (
                  <li key={i} className="text-xs flex items-center gap-2">
                    <span className="text-muted-foreground">•</span>
                    {t.route ? (
                      <Link to={t.route as any} className="text-primary hover:underline">{t.label}</Link>
                    ) : (
                      <span>{t.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
