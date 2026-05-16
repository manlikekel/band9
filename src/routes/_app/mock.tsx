import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QuestionRenderer, gradeAnswers, rawToBand, type IELTSQuestion } from "@/components/QuestionRenderer";
import { Loader2, Sparkles, Clock, Headphones, BookOpen, PenLine, Mic, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { bandColor, countWords } from "@/lib/ielts";

export const Route = createFileRoute("/_app/mock")({ component: MockExam });

type Stage = "intro" | "listening" | "reading" | "writing" | "speaking" | "marking" | "report";

interface Listening { instructions: string; transcript: string; questions: IELTSQuestion[] }
interface Reading { instructions: string; passage: string; questions: IELTSQuestion[] }
interface WritingPrompt { task_type: string; prompt: string; bullet_points?: string[] }
interface SpeakingPrompts {
  part1: string[];
  part2: { topic: string; points: string[] };
  part3: string[];
}

interface MockData {
  listening: Listening[];
  reading: Reading[];
  writing: { task1: WritingPrompt; task2: WritingPrompt };
  speaking: SpeakingPrompts;
}

interface Report {
  overall_band: number;
  strongest_skill: string;
  weakest_skill: string;
  top_5_mistakes: string[];
  seven_day_plan: { day: number; focus: string; tasks: string[] }[];
  next_practice: string[];
}

const TIMES = { listening: 30 * 60, reading: 60 * 60, writing: 60 * 60, speaking: 14 * 60 };

function MockExam() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [stage, setStage] = useState<Stage>("intro");
  const [mode, setMode] = useState<"strict" | "practice">("strict");
  const [data, setData] = useState<MockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);

  // section state
  const [seconds, setSeconds] = useState(0);
  const [listenAnswers, setListenAnswers] = useState<Record<string, string>>({});
  const [readAnswers, setReadAnswers] = useState<Record<string, string>>({});
  const [t1Text, setT1Text] = useState("");
  const [t2Text, setT2Text] = useState("");
  const [speakingTranscripts, setSpeakingTranscripts] = useState<{ part: number; q: string; t: string }[]>([]);

  // bands
  const [bands, setBands] = useState<{ listening?: number; reading?: number; writing?: number; speaking?: number }>({});
  const [report, setReport] = useState<Report | null>(null);

  const playedRef = useRef<Set<number>>(new Set());

  // Sticky timer
  useEffect(() => {
    if (stage === "intro" || stage === "marking" || stage === "report") return;
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (mode === "strict") void autoAdvance();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mode]);

  async function start() {
    if (!user) return;
    setLoading(true);
    try {
      const [l1, l2, l3, l4, r1, r2, r3, w1, w2, sp] = await Promise.all([
        ai({ data: { task: "generate_questions", payload: { section: "listening", part: 1, count: 10 } } }),
        ai({ data: { task: "generate_questions", payload: { section: "listening", part: 2, count: 10 } } }),
        ai({ data: { task: "generate_questions", payload: { section: "listening", part: 3, count: 10 } } }),
        ai({ data: { task: "generate_questions", payload: { section: "listening", part: 4, count: 10 } } }),
        ai({ data: { task: "generate_questions", payload: { section: "reading", part: 1, instruction: "GT Section 1: short factual texts." } } }),
        ai({ data: { task: "generate_questions", payload: { section: "reading", part: 2, instruction: "GT Section 2: workplace/employment text." } } }),
        ai({ data: { task: "generate_questions", payload: { section: "reading", part: 3, instruction: "GT Section 3: longer descriptive text." } } }),
        ai({ data: { task: "writing_prompt", payload: { task: "task1" } } }),
        ai({ data: { task: "writing_prompt", payload: { task: "task2" } } }),
        ai({ data: { task: "speaking_prompt", payload: { part: "all" } } }),
      ]);
      const errs = [l1, l2, l3, l4, r1, r2, r3, w1, w2, sp].find((x) => x.error);
      if (errs?.error) { toast.error(errs.error); setLoading(false); return; }

      const speak = sp.result as any;
      const speaking: SpeakingPrompts = {
        part1: speak.part1 ?? speak.parts?.[0]?.questions ?? ["Where do you live?", "Do you work or study?", "What do you enjoy doing in your free time?"],
        part2: speak.part2 ?? speak.cue_card ?? { topic: "Describe a useful skill you have learned.", points: ["what it is", "when you learned it", "why it is useful"] },
        part3: speak.part3 ?? speak.parts?.[2]?.questions ?? ["How are skills learned today differently from in the past?"],
      };

      const md: MockData = {
        listening: [l1.result, l2.result, l3.result, l4.result] as Listening[],
        reading: [r1.result, r2.result, r3.result] as Reading[],
        writing: { task1: w1.result as WritingPrompt, task2: w2.result as WritingPrompt },
        speaking,
      };
      setData(md);
      const { data: ex } = await supabase.from("mock_exams").insert({
        user_id: user.id, mode, status: "in_progress",
      }).select("id").single();
      setExamId(ex?.id ?? null);
      setStage("listening");
      setSeconds(TIMES.listening);
    } finally {
      setLoading(false);
    }
  }

  async function autoAdvance() {
    if (stage === "listening") await finishListening();
    else if (stage === "reading") await finishReading();
    else if (stage === "writing") await finishWriting();
    else if (stage === "speaking") await finishSpeaking();
  }

  async function finishListening() {
    if (!data) return;
    const all = data.listening.flatMap((p) => p.questions);
    const { correct, total } = gradeAnswers(all, listenAnswers);
    const band = rawToBand(correct, total);
    setBands((b) => ({ ...b, listening: band }));
    setStage("reading"); setSeconds(TIMES.reading);
  }
  async function finishReading() {
    if (!data) return;
    const all = data.reading.flatMap((p) => p.questions);
    const { correct, total } = gradeAnswers(all, readAnswers);
    const band = rawToBand(correct, total);
    setBands((b) => ({ ...b, reading: band }));
    setStage("writing"); setSeconds(TIMES.writing);
  }
  async function finishWriting() {
    if (!data) return;
    setLoading(true);
    const [m1, m2] = await Promise.all([
      ai({ data: { task: "writing_task1", payload: { prompt: data.writing.task1.prompt, bullet_points: data.writing.task1.bullet_points, user_answer: t1Text, word_count: countWords(t1Text), task_type: "general_letter" } } }),
      ai({ data: { task: "writing_task2", payload: { prompt: data.writing.task2.prompt, user_answer: t2Text, word_count: countWords(t2Text) } } }),
    ]);
    const b1 = (m1.result as any)?.estimated_band ?? 5;
    const b2 = (m2.result as any)?.estimated_band ?? 5;
    const band = Math.round(((b1 + b2 * 2) / 3) * 2) / 2;
    setBands((b) => ({ ...b, writing: band }));
    setLoading(false);
    setStage("speaking"); setSeconds(TIMES.speaking);
  }
  async function finishSpeaking() {
    if (!data) return;
    setLoading(true);
    let total = 0, count = 0;
    for (const s of speakingTranscripts) {
      if (!s.t.trim()) continue;
      const r = await ai({ data: { task: "speaking", payload: { part: s.part, question: s.q, transcript: s.t, filler_count: 0 } } });
      const b = (r.result as any)?.estimated_band;
      if (b) { total += b; count++; }
    }
    const band = count ? Math.round((total / count) * 2) / 2 : 5;
    setBands((b) => ({ ...b, speaking: band }));
    setLoading(false);
    await produceReport({ ...bands, speaking: band });
  }

  async function produceReport(b: typeof bands) {
    setStage("marking"); setLoading(true);
    const overall = Math.round(((b.listening ?? 5) + (b.reading ?? 5) + (b.writing ?? 5) + (b.speaking ?? 5)) / 4 * 2) / 2;
    const r = await ai({
      data: {
        task: "mock_report",
        payload: { sections: b, overall, transcripts_summary: speakingTranscripts.map((s) => `Part ${s.part}: ${s.t.slice(0, 200)}`) },
      },
    });
    const rep = (r.result as Report) ?? {
      overall_band: overall, strongest_skill: "Reading", weakest_skill: "Writing",
      top_5_mistakes: [], seven_day_plan: [], next_practice: [],
    };
    rep.overall_band = rep.overall_band ?? overall;
    setReport(rep);
    if (user && examId) {
      await supabase.from("mock_exams").update({
        status: "completed", completed_at: new Date().toISOString(),
        listening_band: b.listening, reading_band: b.reading, writing_band: b.writing, speaking_band: b.speaking,
        overall_band: rep.overall_band, report: rep as any,
      }).eq("id", examId);
    }
    setLoading(false);
    setStage("report");
  }

  // INTRO
  if (stage === "intro") {
    return (
      <div>
        <PageHeader title="Full Mock Exam" subtitle="~2h 44m total" back="/dashboard" />
        <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground">
          <p className="text-xs uppercase opacity-80 tracking-wide">Order</p>
          <ol className="mt-2 text-sm space-y-1">
            <li>1. Listening — 30 min</li>
            <li>2. Reading — 60 min</li>
            <li>3. Writing — 60 min (T1 + T2)</li>
            <li>4. Speaking — ~14 min</li>
          </ol>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("strict")}
            className={`p-4 rounded-2xl border text-left ${mode === "strict" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <p className="text-sm font-semibold">Strict</p>
            <p className="text-xs text-muted-foreground mt-1">Auto-advance when timer ends, no pausing.</p>
          </button>
          <button
            onClick={() => setMode("practice")}
            className={`p-4 rounded-2xl border text-left ${mode === "practice" ? "border-primary bg-primary/5" : "border-border bg-card"}`}
          >
            <p className="text-sm font-semibold">Practice</p>
            <p className="text-xs text-muted-foreground mt-1">Self-paced, no auto-advance.</p>
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Browser TTS is used for listening audio. Audio plays once per part — exam-style.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={start}
          className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Building exam…</> : "Begin mock exam"}
        </button>
        <AiDisclaimer className="mt-5" />
      </div>
    );
  }

  if (stage === "marking" || (loading && stage === "report")) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Generating your full exam report…</p>
      </div>
    );
  }

  if (stage === "report" && report) {
    return <MockReport report={report} bands={bands} />;
  }

  // SECTION HEADER
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const StageIcon = stage === "listening" ? Headphones : stage === "reading" ? BookOpen : stage === "writing" ? PenLine : Mic;

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-2">
          <StageIcon className="h-5 w-5 text-primary" />
          <p className="font-display text-base font-semibold capitalize flex-1">{stage}</p>
          <div className={`flex items-center gap-1 font-mono text-sm ${seconds < 60 ? "text-destructive" : ""}`}>
            <Clock className="h-4 w-4" /> {mm}:{ss}
          </div>
        </div>
      </header>

      {stage === "listening" && data && (
        <ListeningStage data={data.listening} answers={listenAnswers} setAnswers={setListenAnswers} playedRef={playedRef} onDone={finishListening} />
      )}
      {stage === "reading" && data && (
        <ReadingStage data={data.reading} answers={readAnswers} setAnswers={setReadAnswers} onDone={finishReading} />
      )}
      {stage === "writing" && data && (
        <WritingStage prompts={data.writing} t1={t1Text} t2={t2Text} setT1={setT1Text} setT2={setT2Text} onDone={finishWriting} loading={loading} />
      )}
      {stage === "speaking" && data && (
        <SpeakingStage prompts={data.speaking} transcripts={speakingTranscripts} setTranscripts={setSpeakingTranscripts} onDone={finishSpeaking} loading={loading} />
      )}
    </div>
  );
}

// ---------- Stages ----------

function ListeningStage({ data, answers, setAnswers, playedRef, onDone }: {
  data: { instructions: string; transcript: string; questions: IELTSQuestion[] }[];
  answers: Record<string, string>; setAnswers: (a: Record<string, string>) => void;
  playedRef: React.MutableRefObject<Set<number>>;
  onDone: () => void;
}) {
  const [partIdx, setPartIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const part = data[partIdx];
  const offset = useMemo(() => data.slice(0, partIdx).reduce((n, p) => n + p.questions.length, 0), [data, partIdx]);
  const renumbered = part.questions.map((q, i) => ({ ...q, id: offset + i + 1 }));

  function play() {
    if (playedRef.current.has(partIdx)) { toast.warning("Audio plays once per part."); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(part.transcript);
    u.rate = 0.95;
    u.onend = () => { setPlaying(false); playedRef.current.add(partIdx); };
    window.speechSynthesis.speak(u);
    setPlaying(true);
  }

  return (
    <div>
      <div className="mt-4 flex gap-1.5">
        {data.map((_, i) => (
          <button key={i} onClick={() => setPartIdx(i)}
            className={`flex-1 h-8 rounded-md text-[11px] font-medium border ${i === partIdx ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            P{i + 1}
          </button>
        ))}
      </div>
      <section className="mt-4 rounded-2xl gradient-hero p-4 text-primary-foreground flex items-center gap-3">
        <Headphones className="h-5 w-5" />
        <p className="flex-1 text-sm font-medium">Part {partIdx + 1} audio</p>
        <button onClick={play} disabled={playing || playedRef.current.has(partIdx)}
          className="h-10 px-4 rounded-lg bg-white/15 text-sm font-medium disabled:opacity-40">
          {playedRef.current.has(partIdx) ? "Played" : playing ? "Playing…" : "Play once"}
        </button>
      </section>

      <p className="mt-3 text-xs italic text-muted-foreground">{part.instructions}</p>

      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <QuestionRenderer questions={renumbered} answers={answers} onChange={(id, v) => setAnswers({ ...answers, [id]: v })} />
      </section>

      <button onClick={onDone} className="mt-5 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium">
        Submit Listening & continue
      </button>
    </div>
  );
}

function ReadingStage({ data, answers, setAnswers, onDone }: {
  data: { instructions: string; passage: string; questions: IELTSQuestion[] }[];
  answers: Record<string, string>; setAnswers: (a: Record<string, string>) => void;
  onDone: () => void;
}) {
  const [sIdx, setSIdx] = useState(0);
  const sec = data[sIdx];
  const offset = useMemo(() => data.slice(0, sIdx).reduce((n, p) => n + p.questions.length, 0), [data, sIdx]);
  const renumbered = sec.questions.map((q, i) => ({ ...q, id: offset + i + 1 }));

  return (
    <div>
      <div className="mt-4 flex gap-1.5">
        {data.map((_, i) => (
          <button key={i} onClick={() => setSIdx(i)}
            className={`flex-1 h-8 rounded-md text-[11px] font-medium border ${i === sIdx ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
            S{i + 1}
          </button>
        ))}
      </div>
      <section className="mt-4 rounded-2xl border border-border bg-card p-4 max-h-[40vh] overflow-y-auto">
        <p className="text-sm whitespace-pre-line leading-relaxed">{sec.passage}</p>
      </section>
      <p className="mt-3 text-xs italic text-muted-foreground">{sec.instructions}</p>
      <section className="mt-3 rounded-2xl border border-border bg-card p-4">
        <QuestionRenderer questions={renumbered} answers={answers} onChange={(id, v) => setAnswers({ ...answers, [id]: v })} />
      </section>
      <button onClick={onDone} className="mt-5 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium">
        Submit Reading & continue
      </button>
    </div>
  );
}

function WritingStage({ prompts, t1, t2, setT1, setT2, onDone, loading }: {
  prompts: { task1: WritingPrompt; task2: WritingPrompt };
  t1: string; t2: string; setT1: (s: string) => void; setT2: (s: string) => void;
  onDone: () => void; loading: boolean;
}) {
  const [tab, setTab] = useState<"t1" | "t2">("t1");
  const wc1 = countWords(t1), wc2 = countWords(t2);
  return (
    <div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("t1")} className={`flex-1 h-9 rounded-lg text-xs font-medium border ${tab === "t1" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
          Task 1 (20 min)
        </button>
        <button onClick={() => setTab("t2")} className={`flex-1 h-9 rounded-lg text-xs font-medium border ${tab === "t2" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
          Task 2 (40 min)
        </button>
      </div>

      {tab === "t1" ? (
        <>
          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm whitespace-pre-line">{prompts.task1.prompt}</p>
            {prompts.task1.bullet_points && (
              <ul className="mt-3 list-disc pl-5 space-y-1 text-sm">
                {prompts.task1.bullet_points.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
          </section>
          <textarea value={t1} onChange={(e) => setT1(e.target.value)} placeholder="Begin your letter…"
            className="mt-3 w-full min-h-[280px] rounded-xl border border-input bg-background p-3 text-sm" />
          <p className="mt-1 text-[11px]">{wc1} words {wc1 >= 150 ? "✓" : "(min 150)"}</p>
        </>
      ) : (
        <>
          <section className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm whitespace-pre-line">{prompts.task2.prompt}</p>
          </section>
          <textarea value={t2} onChange={(e) => setT2(e.target.value)} placeholder="Begin your essay…"
            className="mt-3 w-full min-h-[320px] rounded-xl border border-input bg-background p-3 text-sm" />
          <p className="mt-1 text-[11px]">{wc2} words {wc2 >= 250 ? "✓" : "(min 250)"}</p>
        </>
      )}

      <button disabled={loading} onClick={onDone}
        className="mt-5 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Marking writing…</> : "Submit writing & continue"}
      </button>
    </div>
  );
}

function SpeakingStage({ prompts, transcripts, setTranscripts, onDone, loading }: {
  prompts: SpeakingPrompts;
  transcripts: { part: number; q: string; t: string }[];
  setTranscripts: (s: { part: number; q: string; t: string }[]) => void;
  onDone: () => void; loading: boolean;
}) {
  const items: { part: number; q: string }[] = [
    ...prompts.part1.slice(0, 4).map((q) => ({ part: 1, q })),
    { part: 2, q: `Cue card: ${prompts.part2.topic}\nPoints: ${prompts.part2.points.join("; ")}` },
    ...prompts.part3.slice(0, 3).map((q) => ({ part: 3, q })),
  ];

  function setT(i: number, v: string) {
    const next = [...items.map((it) => transcripts.find((x) => x.q === it.q) ?? { ...it, t: "" })];
    next[i] = { ...next[i], t: v };
    setTranscripts(next);
  }

  return (
    <div>
      <p className="mt-4 text-xs text-muted-foreground">
        Type or dictate your spoken answer to each examiner question. (Mic optional — use any browser dictation.)
      </p>
      <div className="mt-3 space-y-3">
        {items.map((it, i) => {
          const cur = transcripts.find((x) => x.q === it.q)?.t ?? "";
          return (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-wide text-primary">Part {it.part}</p>
              <p className="mt-1 text-sm whitespace-pre-line font-medium">{it.q}</p>
              <textarea value={cur} onChange={(e) => setT(i, e.target.value)}
                placeholder="Your spoken answer…"
                className="mt-2 w-full min-h-[80px] rounded-lg border border-input bg-background p-2 text-sm" />
            </div>
          );
        })}
      </div>
      <button disabled={loading} onClick={onDone}
        className="mt-5 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Marking speaking…</> : <><Sparkles className="h-4 w-4" /> Finish exam & generate report</>}
      </button>
    </div>
  );
}

function MockReport({ report, bands }: { report: Report; bands: { listening?: number; reading?: number; writing?: number; speaking?: number } }) {
  return (
    <div>
      <PageHeader title="Mock Exam Report" back="/dashboard" />
      <section className="mt-4 rounded-2xl gradient-hero p-6 text-primary-foreground text-center">
        <p className="text-xs uppercase tracking-wide opacity-80">Overall band</p>
        <p className="font-display text-7xl font-semibold text-gradient-gold mt-1">{report.overall_band}</p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        {(["listening", "reading", "writing", "speaking"] as const).map((k) => (
          <div key={k} className="rounded-2xl border border-border bg-card p-3">
            <p className="text-[11px] capitalize text-muted-foreground">{k}</p>
            <p className={`font-display text-2xl font-semibold mt-1 ${bandColor(bands[k])}`}>{bands[k] ?? "—"}</p>
          </div>
        ))}
      </section>

      <Block title="Strongest skill"><span className="text-success font-medium">{report.strongest_skill}</span></Block>
      <Block title="Weakest skill"><span className="text-destructive font-medium">{report.weakest_skill}</span></Block>

      {report.top_5_mistakes?.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-2">Top mistakes</p>
          <ul className="list-disc pl-5 text-sm space-y-1">{report.top_5_mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </section>
      )}

      {report.seven_day_plan?.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-2">7-day improvement plan</p>
          <div className="space-y-2">
            {report.seven_day_plan.map((d) => (
              <div key={d.day} className="border-l-2 border-primary pl-3">
                <p className="text-xs font-semibold">Day {d.day} — {d.focus}</p>
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {d.tasks.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold mb-1">{title}</p>
      <p className="text-sm">{children}</p>
    </section>
  );
}
