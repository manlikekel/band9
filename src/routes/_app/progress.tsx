import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { bandColor } from "@/lib/ielts";
import { TrendingUp, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app/progress")({ component: ProgressPage });

interface Row { section: string; estimated_band: number | null; created_at: string }

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

  // Per-section averages
  const bySection = ["listening", "reading", "writing", "speaking"].map((sec) => {
    const wRows = sec === "writing" ? writing : sec === "speaking" ? speaking : practice.filter((r) => r.section === sec);
    const bands = wRows.map((r: any) => Number(r.estimated_band)).filter((n) => Number.isFinite(n));
    const avg = bands.length ? Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2 : 0;
    return { section: sec[0].toUpperCase() + sec.slice(1), band: avg, attempts: bands.length };
  });

  const trend = mocks.map((m) => ({
    d: new Date(m.completed_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overall: Number(m.overall_band ?? 0),
    listening: Number(m.listening_band ?? 0),
    reading: Number(m.reading_band ?? 0),
    writing: Number(m.writing_band ?? 0),
    speaking: Number(m.speaking_band ?? 0),
  }));

  const weakest = bySection.filter((s) => s.attempts > 0).sort((a, b) => a.band - b.band)[0];

  return (
    <div>
      <PageHeader title="Progress" subtitle="Trends, strengths & weaknesses" back="/dashboard" />

      {practice.length + mocks.length + writing.length + speaking.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
          Complete some practice sessions or a mock exam to see your trends.
        </div>
      ) : (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3">
            {bySection.map((s) => (
              <div key={s.section} className="rounded-2xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">{s.section}</p>
                <p className={`font-display text-2xl font-semibold mt-1 ${bandColor(s.band || null)}`}>
                  {s.band || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.attempts} attempt{s.attempts === 1 ? "" : "s"}</p>
              </div>
            ))}
          </section>

          {weakest && weakest.band > 0 && (
            <section className="mt-4 rounded-2xl border border-warning/30 bg-warning/5 p-4">
              <p className="text-xs font-semibold flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-warning" /> Focus area</p>
              <p className="text-sm mt-1">Your weakest skill is <span className="font-semibold text-warning">{weakest.section}</span> (avg band {weakest.band}). Add more {weakest.section.toLowerCase()} practice this week.</p>
            </section>
          )}

          {trend.length > 0 && (
            <section className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> Mock exam trend</p>
              <div className="h-52 mt-3">
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="d" tick={{ fontSize: 10 }} />
                    <YAxis domain={[3, 9]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="overall" stroke="oklch(0.45 0.13 255)" strokeWidth={2.5} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Skill comparison</p>
            <div className="h-48 mt-3">
              <ResponsiveContainer>
                <BarChart data={bySection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="section" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="band" fill="oklch(0.7 0.14 75)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-semibold">Recent mock exams</p>
            <ul className="mt-2 divide-y divide-border">
              {mocks.slice(-5).reverse().map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{new Date(m.completed_at).toLocaleDateString()}</span>
                  <span className={`font-display text-lg font-semibold ${bandColor(Number(m.overall_band))}`}>{m.overall_band}</span>
                </li>
              ))}
              {mocks.length === 0 && <li className="py-3 text-xs text-muted-foreground text-center">No mocks yet.</li>}
            </ul>
          </section>
        </>
      )}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
