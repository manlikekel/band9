import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { daysUntil, bandColor } from "@/lib/ielts";
import { Target, Flame, Trophy, Calendar, TrendingUp, BookOpen, Mic, PenLine, FileText, ListChecks, ArrowRight, Headphones, Sparkles } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

interface Profile {
  full_name: string | null;
  target_band: number | null;
  current_band: number | null;
  exam_date: string | null;
  weakest_skill: string | null;
  streak_days: number | null;
}

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ practice: 0, mocks: 0, latestBand: null as number | null });
  const [trend, setTrend] = useState<{ d: string; band: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { count: pc }, { count: mc }, { data: latest }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("practice_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("mock_exams").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed"),
        supabase.from("mock_exams").select("overall_band, completed_at").eq("user_id", user.id).eq("status", "completed").order("completed_at", { ascending: false }).limit(10),
      ]);
      setProfile(p as Profile | null);
      setStats({ practice: pc ?? 0, mocks: mc ?? 0, latestBand: latest?.[0]?.overall_band ?? null });
      setTrend(
        (latest ?? []).slice().reverse().map((r) => ({
          d: new Date(r.completed_at!).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          band: Number(r.overall_band ?? 0),
        }))
      );
    })();
  }, [user]);

  const days = daysUntil(profile?.exam_date);
  const fname = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div>
      <header className="pt-6 pb-4">
        <p className="text-xs text-muted-foreground">Welcome back</p>
        <h1 className="font-display text-2xl font-semibold">Hi, {fname}</h1>
      </header>

      {/* Hero */}
      <section className="rounded-2xl gradient-hero p-5 text-primary-foreground shadow-[var(--shadow-elevated)] relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide opacity-80">Target band</p>
            <p className="font-display text-5xl font-semibold mt-1 text-gradient-gold">{profile?.target_band ?? "—"}</p>
            <p className="text-xs opacity-85 mt-2">
              {days != null ? `${days} days until your exam` : "Set your exam date"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide opacity-80">Current</p>
            <p className="font-display text-3xl font-semibold mt-1">{profile?.current_band ?? "—"}</p>
            <p className="text-xs opacity-85 mt-2">Last mock: {stats.latestBand ?? "—"}</p>
          </div>
        </div>
      </section>

      {/* Streak / stats */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={Flame} label="Streak" value={`${profile?.streak_days ?? 0}d`} />
        <Stat icon={Trophy} label="Mocks" value={String(stats.mocks)} />
        <Stat icon={Calendar} label="Practice" value={String(stats.practice)} />
      </section>

      {/* Recommended */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <p className="text-sm font-semibold">Recommended for today</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Focus area: <span className="font-medium text-foreground">{profile?.weakest_skill ?? "Mixed"}</span>
        </p>
        <Link to="/practice" className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium">
          Start today's session <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Action grid */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <ActionCard to="/practice" icon={BookOpen} title="Practice" subtitle="Listen, read, write" tone="primary" />
        <ActionCard to="/mock" icon={Target} title="Full Mock" subtitle="Real exam mode" tone="gold" />
        <ActionCard to="/practice/writing-task1" icon={PenLine} title="Writing T1" subtitle="Letter + AI mark" />
        <ActionCard to="/practice/writing-task2" icon={FileText} title="Writing T2" subtitle="Essay + AI mark" />
        <ActionCard to="/practice/speaking" icon={Mic} title="Speaking" subtitle="Parts 1 – 3" />
        <ActionCard to="/practice/listening" icon={Headphones} title="Listening" subtitle="All 4 sections" />
        <ActionCard to="/study-plan" icon={ListChecks} title="Study Plan" subtitle={`${profile && (profile as any).plan_length || 15}-day`} />
        <ActionCard to="/progress" icon={TrendingUp} title="Progress" subtitle="Trends + report" />
      </section>

      {/* Trend chart */}
      {trend.length > 0 && (
        <section className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-sm font-semibold">Band improvement</p>
          <p className="text-[11px] text-muted-foreground">Last {trend.length} mock exams</p>
          <div className="h-40 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="d" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[3, 9]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Line type="monotone" dataKey="band" stroke="oklch(0.45 0.13 255)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <p className="text-[10px] text-muted-foreground mt-6 text-center px-4 leading-relaxed">
        AI-estimated practice bands based on IELTS-style criteria. Not official IELTS scores.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
      <Icon className="h-4 w-4 text-primary" />
      <p className="font-display text-xl font-semibold mt-2">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, subtitle, tone }: { to: string; icon: any; title: string; subtitle: string; tone?: "primary" | "gold" }) {
  return (
    <Link to={to as any} className={`rounded-2xl p-4 border shadow-[var(--shadow-card)] transition active:scale-[0.99] ${tone === "primary" ? "bg-primary text-primary-foreground border-primary" : tone === "gold" ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border"}`}>
      <Icon className="h-5 w-5" />
      <p className="mt-3 font-semibold text-sm">{title}</p>
      <p className={`text-[11px] ${tone ? "opacity-85" : "text-muted-foreground"}`}>{subtitle}</p>
    </Link>
  );
}
