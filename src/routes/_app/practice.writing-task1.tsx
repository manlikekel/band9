import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { countWords, bandColor } from "@/lib/ielts";
import { toast } from "sonner";
import { Clock, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/practice/writing-task1")({ component: WritingT1 });

interface Prompt { task_type: string; prompt: string; bullet_points: string[] }
interface Marking {
  estimated_band: number;
  task_achievement_band: number; coherence_cohesion_band: number;
  lexical_resource_band: number; grammar_band: number;
  bullet_point_coverage: { bullet: string; covered: boolean; comment: string }[];
  grammar_errors: { quote: string; fix: string; explanation: string }[];
  vocabulary_errors: { quote: string; suggestion: string; explanation: string }[];
  coherence_issues: string[];
  corrected_answer: string;
  band_8_9_sample: string;
  three_improvement_tips: string[];
}

function WritingT1() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState(20 * 60);
  const [running, setRunning] = useState(false);
  const [marking, setMarking] = useState<Marking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wc = useMemo(() => countWords(text), [text]);

  useEffect(() => {
    (async () => {
      setLoadingPrompt(true);
      const r = await ai({ data: { task: "writing_prompt", payload: { task: "task1" } } });
      if (r.error) toast.error(r.error);
      else setPrompt(r.result as Prompt);
      setLoadingPrompt(false);
    })();
  }, [ai]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const submit = async () => {
    if (!prompt || !user) return;
    if (wc < 100) { toast.warning("Write at least 100 words before submitting."); return; }
    setSubmitting(true); setRunning(false);
    const r = await ai({
      data: {
        task: "writing_task1",
        payload: { prompt: prompt.prompt, bullet_points: prompt.bullet_points, user_answer: text, word_count: wc, task_type: "general_letter" },
      },
    });
    if (r.error || !r.result) { toast.error(r.error ?? "Failed"); setSubmitting(false); return; }
    const m = r.result as Marking;
    setMarking(m);
    await supabase.from("writing_submissions").insert({
      user_id: user.id, task_type: "task1", prompt: prompt.prompt, bullet_points: prompt.bullet_points,
      user_answer: text, word_count: wc, marking: m as any, estimated_band: m.estimated_band,
    });
    setSubmitting(false);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  if (marking) return <Result m={marking} />;

  return (
    <div>
      <PageHeader
        title="Writing Task 1"
        subtitle="Letter • 20 min • 150+ words"
        back="/practice"
        right={<div className="flex items-center gap-1 text-sm font-mono"><Clock className="h-4 w-4" />{mm}:{ss}</div>}
      />

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        {loadingPrompt ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generating prompt…</div>
        ) : prompt ? (
          <>
            <p className="text-sm whitespace-pre-line leading-relaxed">{prompt.prompt}</p>
            <ul className="mt-3 list-disc pl-5 space-y-1 text-sm">
              {prompt.bullet_points?.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </>
        ) : null}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setRunning(true)}
        placeholder="Begin your letter…"
        className="mt-4 w-full min-h-[320px] rounded-2xl border border-input bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={wc < 150 ? "text-warning" : "text-success"}>{wc} words {wc < 150 ? `(min 150)` : "✓"}</span>
        <button onClick={() => setRunning((r) => !r)} className="text-xs underline text-muted-foreground">
          {running ? "Pause timer" : "Start timer"}
        </button>
      </div>

      <button
        disabled={submitting}
        onClick={submit}
        className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Marking…</> : <><Sparkles className="h-4 w-4" /> Submit for AI marking</>}
      </button>

      <AiDisclaimer className="mt-5" />
    </div>
  );
}

function Result({ m }: { m: Marking }) {
  const nav = useNavigate();
  return (
    <div>
      <PageHeader title="Writing Task 1 — Result" back="/practice" />
      <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground text-center">
        <p className="text-xs uppercase tracking-wide opacity-80">Estimated band</p>
        <p className="font-display text-6xl font-semibold text-gradient-gold mt-1">{m.estimated_band}</p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Crit label="Task Achievement" v={m.task_achievement_band} />
        <Crit label="Coherence & Cohesion" v={m.coherence_cohesion_band} />
        <Crit label="Lexical Resource" v={m.lexical_resource_band} />
        <Crit label="Grammar" v={m.grammar_band} />
      </section>

      <Section title="Bullet point coverage">
        <ul className="space-y-2">
          {m.bullet_point_coverage?.map((b, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className={b.covered ? "text-success" : "text-destructive"}>{b.covered ? "✓" : "✗"}</span>
              <div><p className="font-medium">{b.bullet}</p><p className="text-xs text-muted-foreground">{b.comment}</p></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Grammar issues">
        <ul className="space-y-2">{m.grammar_errors?.map((e, i) => <Issue key={i} q={e.quote} f={e.fix} ex={e.explanation} />)}</ul>
      </Section>

      <Section title="Vocabulary upgrades">
        <ul className="space-y-2">{m.vocabulary_errors?.map((e, i) => <Issue key={i} q={e.quote} f={e.suggestion} ex={e.explanation} />)}</ul>
      </Section>

      <Section title="Corrected version"><p className="text-sm whitespace-pre-line">{m.corrected_answer}</p></Section>
      <Section title="Band 8/9 sample answer"><p className="text-sm whitespace-pre-line">{m.band_8_9_sample}</p></Section>

      <Section title="Three things to improve">
        <ol className="list-decimal pl-5 space-y-1 text-sm">{m.three_improvement_tips?.map((t, i) => <li key={i}>{t}</li>)}</ol>
      </Section>

      <button onClick={() => nav({ to: "/practice" })} className="mt-6 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium">Back to practice</button>
      <AiDisclaimer className="mt-5" />
    </div>
  );
}

function Crit({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-semibold mt-1 ${bandColor(v)}`}>{v}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="text-sm font-semibold mb-3">{title}</p>
      {children}
    </section>
  );
}
function Issue({ q, f, ex }: { q: string; f: string; ex: string }) {
  return (
    <li className="text-sm border-l-2 border-warning pl-3">
      <p className="line-through text-muted-foreground">{q}</p>
      <p className="font-medium text-success">→ {f}</p>
      <p className="text-xs text-muted-foreground mt-1">{ex}</p>
    </li>
  );
}
