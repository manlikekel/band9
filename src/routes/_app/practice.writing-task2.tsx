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

export const Route = createFileRoute("/_app/practice/writing-task2")({ component: WritingT2 });

interface Prompt { task_type: string; prompt: string; essay_type?: string }
interface Marking {
  estimated_band: number;
  task_response_band: number; coherence_cohesion_band: number;
  lexical_resource_band: number; grammar_band: number;
  thesis_clarity: string; paragraph_structure: string;
  grammar_errors: { quote: string; fix: string; explanation: string }[];
  vocabulary_errors: { quote: string; suggestion: string; explanation: string }[];
  repeated_words: { word: string; count: number; suggestion: string }[];
  corrected_essay: string; band_8_9_sample_essay: string;
  three_improvement_tips: string[];
}

function WritingT2() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [plan, setPlan] = useState("");
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState(40 * 60);
  const [running, setRunning] = useState(false);
  const [marking, setMarking] = useState<Marking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wc = useMemo(() => countWords(text), [text]);

  useEffect(() => {
    (async () => {
      const r = await ai({ data: { task: "writing_prompt", payload: { task: "task2" } } });
      if (r.error) toast.error(r.error); else setPrompt(r.result as Prompt);
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
    if (wc < 200) { toast.warning("Write at least 200 words."); return; }
    setSubmitting(true); setRunning(false);
    const r = await ai({
      data: { task: "writing_task2", payload: { prompt: prompt.prompt, essay_type: prompt.essay_type, user_answer: text, word_count: wc } },
    });
    if (r.error || !r.result) { toast.error(r.error ?? "Failed"); setSubmitting(false); return; }
    const m = r.result as Marking;
    setMarking(m);
    await supabase.from("writing_submissions").insert({
      user_id: user.id, task_type: "task2", prompt: prompt.prompt, essay_type: prompt.essay_type,
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
        title="Writing Task 2"
        subtitle="Essay • 40 min • 250+ words"
        back="/practice"
        right={<div className="flex items-center gap-1 text-sm font-mono"><Clock className="h-4 w-4" />{mm}:{ss}</div>}
      />

      <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        {loadingPrompt ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generating essay prompt…</div>
        ) : prompt ? (
          <>
            {prompt.essay_type && <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{prompt.essay_type}</p>}
            <p className="text-sm whitespace-pre-line leading-relaxed">{prompt.prompt}</p>
          </>
        ) : null}
      </div>

      <details className="mt-4 rounded-2xl border border-border bg-card p-4">
        <summary className="text-sm font-medium cursor-pointer">Essay plan (intro, body 1, body 2, conclusion)</summary>
        <textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Quick plan…" className="mt-3 w-full min-h-[100px] rounded-xl border border-input bg-background p-3 text-sm" />
      </details>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setRunning(true)}
        placeholder="Write your essay…"
        className="mt-4 w-full min-h-[360px] rounded-2xl border border-input bg-background p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={wc < 250 ? "text-warning" : "text-success"}>{wc} words {wc < 250 ? "(min 250)" : "✓"}</span>
        <button onClick={() => setRunning((r) => !r)} className="text-xs underline text-muted-foreground">{running ? "Pause" : "Start"} timer</button>
      </div>

      <button disabled={submitting} onClick={submit} className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
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
      <PageHeader title="Task 2 — Result" back="/practice" />
      <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground text-center">
        <p className="text-xs uppercase tracking-wide opacity-80">Estimated band</p>
        <p className="font-display text-6xl font-semibold text-gradient-gold mt-1">{m.estimated_band}</p>
      </section>
      <section className="mt-4 grid grid-cols-2 gap-3">
        <C l="Task Response" v={m.task_response_band} />
        <C l="Coherence" v={m.coherence_cohesion_band} />
        <C l="Lexical" v={m.lexical_resource_band} />
        <C l="Grammar" v={m.grammar_band} />
      </section>
      <S t="Thesis & structure"><p className="text-sm">{m.thesis_clarity}</p><p className="text-sm mt-2 text-muted-foreground">{m.paragraph_structure}</p></S>
      <S t="Grammar"><ul className="space-y-2">{m.grammar_errors?.map((e, i) => <I key={i} q={e.quote} f={e.fix} ex={e.explanation} />)}</ul></S>
      <S t="Vocabulary"><ul className="space-y-2">{m.vocabulary_errors?.map((e, i) => <I key={i} q={e.quote} f={e.suggestion} ex={e.explanation} />)}</ul></S>
      {m.repeated_words?.length > 0 && (
        <S t="Repeated words">
          <ul className="text-sm space-y-1">{m.repeated_words.map((w, i) => <li key={i}>{w.word} <span className="text-muted-foreground">×{w.count}</span> → {w.suggestion}</li>)}</ul>
        </S>
      )}
      <S t="Corrected essay"><p className="text-sm whitespace-pre-line">{m.corrected_essay}</p></S>
      <S t="Band 8/9 sample"><p className="text-sm whitespace-pre-line">{m.band_8_9_sample_essay}</p></S>
      <S t="Three improvement goals"><ol className="list-decimal pl-5 text-sm space-y-1">{m.three_improvement_tips?.map((t, i) => <li key={i}>{t}</li>)}</ol></S>
      <button onClick={() => nav({ to: "/practice" })} className="mt-6 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium">Back to practice</button>
      <AiDisclaimer className="mt-5" />
    </div>
  );
}
function C({ l, v }: { l: string; v: number }) {
  return <div className="rounded-2xl border border-border bg-card p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className={`font-display text-2xl font-semibold mt-1 ${bandColor(v)}`}>{v}</p></div>;
}
function S({ t, children }: { t: string; children: React.ReactNode }) {
  return <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"><p className="text-sm font-semibold mb-3">{t}</p>{children}</section>;
}
function I({ q, f, ex }: { q: string; f: string; ex: string }) {
  return <li className="text-sm border-l-2 border-warning pl-3"><p className="line-through text-muted-foreground">{q}</p><p className="font-medium text-success">→ {f}</p><p className="text-xs text-muted-foreground mt-1">{ex}</p></li>;
}
