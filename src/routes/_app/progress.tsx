import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { bandColor } from "@/lib/ielts";
import { TrendingUp, AlertCircle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/progress")({ component: ProgressPage });

interface Row { section: string; estimated_band: number | null; created_at: string }

const GOLD = "oklch(0.78 0.13 88)";
const CREAM = "oklch(0.95 0.025 90)";
const BORDER = "oklch(1 0 0 / 0.10)";
const MUTED = "oklch(0.85 0.04 90 / 0.6)";

const tooltipStyle = {
  background: "oklch(0.34 0.075 163)",
  border: "1px solid oklch(0.78 0.13 88 / 0.4)",
  borderRadius: "0.75rem",
  fontSize: 12,
  color: "oklch(0.96 0.02 88)",
};

function ProgressPage() {
  const { user } = useAuth();
  const [practice, setPractice] = useState<Row[]>([]);
  const [mocks, setMocks] = useState<any[]>([]);
  const [writing, setWriting] = useState<any[]>([]);
  const [speaking, setSpeaking] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [p, m, w, s] = await Promise.all([
        supabase.from("practice_sessions").select("section,estimated_band,created_at").eq("user_id", user.id).order("created_at"),
        supabase.from("mock_exams").select("*").eq("user_id", user.id).eq("status", "completed").order("completed_at"),
        supabase.from("writing_submissions").select("estimated_band,created_at,task_type").eq("user_id", user.id).order("created_at"),
        supabase.from("speaking_submissions").select("estimated_band,created_at,part").eq("user_id", user.id).order("created_at"),
      ]);
      setPractice((p.data ?? []) as Row[]);
      setMocks(m.data ?? []);
      setWriting(w.data ?? []);
      setSpeaking(s.data ?? []);
    })();
  }, [user]);

  const bySection = ["listening", "reading", "writing", "speaking"].map((sec) => {
    const wRows = sec === "writing" ? writing : sec === "speaking" ? speaking : practice.filter((r) => r.section === sec);
    const bands = wRows.map((r: any) => Number(r.estimated_band)).filter((n) => Number.isFinite(n));
    const avg = bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2 : 0;
    return { section: sec[0].toUpperCase() + sec.slice(1), band: avg, attempts: bands.length };
  });

  const trend = mocks.map((m) => ({
    d: new Date(m.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overall: Number(m.overall_band ?? 0),
  }));

  const weakest = bySection.filter((s) => s.attempts > 0).sort((a, b) => a.band - b.band)[0];
  const empty = practice.length + mocks.length + writing.length + speaking.length === 0;

  return (
    <div>
      <PageHeader title="Progress" subtitle="Trends · Strengths" back="/dashboard" />

      {empty ? (
        <div className="mt-12 text-center text-sm text-foreground/60">
          <div className="h-14 w-14 mx-auto rounded-2xl border border-gold/30 grid place-items-center mb-4">
            <Sparkles className="h-6 w-6 text-gold" />
          </div>
          Complete some practice or a mock exam to see your trends.
        </div>
      ) : (
        <>
          <section className="mt-5 grid grid-cols-2 gap-3">
            {bySection.map((s) => (
              <div key={s.section} className="tile p-4">
                <p className="eyebrow">{s.section}</p>
                <p className={`font-display text-4xl mt-2 ${bandColor(s.band || null)}`}>
                  {s.band || "—"}
                </p>
                <p className="text-[10px] text-foreground/50 mt-1 uppercase tracking-wider">
                  {s.attempts} attempt{s.attempts === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </section>

          {weakest && weakest.band > 0 && (
            <section className="mt-4 rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <p className="eyebrow flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> Focus area
              </p>
              <p className="text-sm mt-2">
                Weakest skill is{" "}
                <span className="font-display text-gold text-base">{weakest.section}</span>{" "}
                <span className="text-foreground/60">(avg band {weakest.band}).</span> Prioritise this skill in your next session.
              </p>
            </section>
          )}

          {trend.length > 0 && (
            <section className="mt-4 tile p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow">Performance</p>
                  <p className="font-display text-lg mt-0.5 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gold" /> Mock trend
                  </p>
                </div>
                <span className="text-[10px] text-foreground/50">{trend.length} mock{trend.length === 1 ? "" : "s"}</span>
              </div>
              <div className="h-44 mt-3 -mx-2">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <XAxis dataKey="d" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                    <YAxis domain={[3, 9]} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="overall" stroke={GOLD} strokeWidth={2.5} dot={{ r: 3, fill: GOLD }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="mt-4 tile p-5">
            <p className="eyebrow">Skill Comparison</p>
            <p className="font-display text-lg mt-0.5">By section</p>
            <div className="h-48 mt-3 -mx-2">
              <ResponsiveContainer>
                <BarChart data={bySection}>
                  <XAxis dataKey="section" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
                  <Bar dataKey="band" fill={GOLD} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-4 tile p-5">
            <p className="eyebrow">History</p>
            <p className="font-display text-lg mt-0.5">Recent mocks</p>
            <ul className="mt-3 divide-y" style={{ borderColor: BORDER }}>
              {mocks.slice(-5).reverse().map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between">
                  <span className="text-xs text-foreground/60 font-mono">
                    {new Date(m.completed_at).toLocaleDateString()}
                  </span>
                  <span className={`font-display text-xl ${bandColor(Number(m.overall_band))}`}>
                    {m.overall_band}
                  </span>
                </li>
              ))}
              {mocks.length === 0 && (
                <li className="py-3 text-xs text-foreground/50 text-center">No mocks yet.</li>
              )}
            </ul>
          </section>
        </>
      )}

      <AiDisclaimer className="mt-6" />
    </div>
  );
}
