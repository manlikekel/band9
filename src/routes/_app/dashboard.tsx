import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { daysUntil } from "@/lib/ielts";
import {
  Target,
  Flame,
  Trophy,
  BookOpen,
  Mic,
  PenLine,
  FileText,
  ListChecks,
  ArrowRight,
  Headphones,
  Sparkles,
  TrendingUp,
  ChevronsRight,
} from "lucide-react";
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
  const target = profile?.target_band ?? 0;
  const current = profile?.current_band ?? 0;
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="pt-5">
      {/* Brand header */}
      <header className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold grid place-items-center text-gold-foreground gold-glow">
            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="eyebrow leading-none">Band9 Coach</p>
            <p className="text-xs text-foreground/60 mt-1">Hi, {fname}</p>
          </div>
        </div>
        <Link
          to="/settings"
          className="h-10 w-10 rounded-full border border-gold/40 bg-card grid place-items-center text-foreground/70 hover:text-gold transition"
          aria-label="Settings"
        >
          <span className="font-display text-base">{fname.charAt(0).toUpperCase()}</span>
        </Link>
      </header>

      {/* Hero target card */}
      <section className="relative overflow-hidden rounded-[28px] gradient-hero border border-border p-6 shadow-[var(--shadow-elevated)]">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold/15 blur-3xl" />
        <div className="relative">
          <p className="eyebrow">Projected Outcome</p>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="font-display text-6xl leading-none text-gradient-gold">
              {target || "—"}
            </h2>
            <span className="text-xs font-bold text-gold uppercase tracking-widest">
              Target
            </span>
          </div>
          <div className="mt-5 space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-foreground/60">
              <span>Toward target</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/25 overflow-hidden">
              <div
                className="h-full bg-gold gold-glow rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-foreground/70 pt-1">
              <span>Now: <span className="text-foreground font-semibold">{current || "—"}</span></span>
              <span>{days != null ? `${days} days to exam` : "Set exam date"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={Flame} label="Day Streak" value={String(profile?.streak_days ?? 0)} />
        <Stat icon={Trophy} label="Mocks" value={String(stats.mocks).padStart(2, "0")} />
        <Stat icon={TrendingUp} label="Last" value={stats.latestBand != null ? String(stats.latestBand) : "—"} />
      </section>

      {/* Recommended */}
      <Link
        to="/practice"
        className="mt-4 flex items-center justify-between rounded-[24px] border border-dashed border-gold/40 bg-card/30 px-5 py-4 hover:bg-card/50 transition group"
      >
        <div>
          <p className="eyebrow">Today's Focus</p>
          <p className="font-display text-lg mt-0.5">
            {profile?.weakest_skill ?? "Mixed practice"}
          </p>
        </div>
        <div className="h-9 w-9 rounded-full bg-gold text-gold-foreground grid place-items-center group-hover:translate-x-0.5 transition">
          <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </div>
      </Link>

      {/* Action bento */}
      <section className="mt-4 grid grid-cols-4 auto-rows-[88px] gap-3">
        {/* Featured cream tile */}
        <Link
          to="/practice"
          className="col-span-2 row-span-2 tile-cream p-5 flex flex-col justify-between active:scale-[0.99] transition"
        >
          <div className="h-10 w-10 rounded-xl bg-cream-foreground text-gold grid place-items-center">
            <BookOpen className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cream-foreground/60">Skills</p>
            <p className="font-display text-2xl leading-tight mt-1">Practice<br />Center</p>
          </div>
        </Link>

        {/* Gold mock CTA */}
        <Link
          to="/mock"
          className="col-span-2 tile-gold px-4 flex items-center justify-between active:scale-[0.99] transition"
        >
          <span className="font-display text-lg">Full Mock</span>
          <div className="h-8 w-8 rounded-full bg-gold-foreground/10 grid place-items-center">
            <ChevronsRight className="h-4 w-4" strokeWidth={2.5} />
          </div>
        </Link>

        {/* Two square emerald tiles */}
        <MiniTile to="/practice/writing-task1" label="W1" icon={PenLine} />
        <MiniTile to="/practice/writing-task2" label="W2" icon={FileText} />

        {/* Listening wide */}
        <Link
          to="/practice/listening"
          className="col-span-2 tile px-4 flex items-center gap-3 active:scale-[0.99] transition"
        >
          <div className="text-gold">
            <Headphones className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">Listening</span>
            <span className="text-xs font-semibold">All 4 sections</span>
          </div>
        </Link>

        {/* Speaking */}
        <Link
          to="/practice/speaking"
          className="col-span-2 tile px-4 flex items-center justify-between active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">AI Speaking</span>
          </div>
          <Mic className="h-4 w-4 text-gold" />
        </Link>

        {/* Study plan wide */}
        <Link
          to="/study-plan"
          className="col-span-2 tile px-4 flex items-center justify-between active:scale-[0.99] transition"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Study Plan</span>
          <ListChecks className="h-4 w-4 text-gold" />
        </Link>

        {/* Progress wide */}
        <Link
          to="/progress"
          className="col-span-2 tile px-4 flex items-center justify-between active:scale-[0.99] transition"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Progress</span>
          <TrendingUp className="h-4 w-4 text-gold" />
        </Link>
      </section>

      {/* Trend chart */}
      {trend.length > 0 && (
        <section className="mt-5 rounded-[24px] border border-border bg-card/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Performance</p>
              <p className="font-display text-lg mt-0.5">Band trend</p>
            </div>
            <span className="text-[10px] text-foreground/50">Last {trend.length} mocks</span>
          </div>
          <div className="h-40 mt-3 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <XAxis dataKey="d" tick={{ fontSize: 10, fill: "oklch(0.85 0.04 90 / 0.6)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[3, 9]} tick={{ fontSize: 10, fill: "oklch(0.85 0.04 90 / 0.6)" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.34 0.075 163)",
                    border: "1px solid oklch(0.78 0.13 88 / 0.4)",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    color: "oklch(0.96 0.02 88)",
                  }}
                />
                <Line type="monotone" dataKey="band" stroke="oklch(0.78 0.13 88)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.78 0.13 88)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <p className="text-[10px] text-foreground/40 mt-6 text-center px-4 leading-relaxed">
        AI-estimated practice bands based on IELTS-style criteria. Not official IELTS scores.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-border bg-card/50 p-3.5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{label}</p>
        <Icon className="h-3.5 w-3.5 text-gold/70" />
      </div>
      <p className="font-display text-2xl leading-none mt-1">{value}</p>
    </div>
  );
}

function MiniTile({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <Link
      to={to as any}
      className="tile flex flex-col items-center justify-center gap-2 active:scale-[0.99] transition"
    >
      <Icon className="h-4 w-4 text-gold" strokeWidth={2.2} />
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">{label}</span>
    </Link>
  );
}
