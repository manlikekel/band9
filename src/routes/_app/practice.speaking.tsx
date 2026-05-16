import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Mic, MicOff, Loader2, Sparkles, Clock, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { bandColor } from "@/lib/ielts";

export const Route = createFileRoute("/_app/practice/speaking")({ component: SpeakingPractice });

type Part = 1 | 2 | 3;

interface Part1 { part: 1; questions: string[] }
interface Part2 { part: 2; cue_card: { topic: string; points: string[] } }
interface Part3 { part: 3; questions: string[] }
type Material = Part1 | Part2 | Part3;

interface Marking {
  estimated_band: number;
  fluency_coherence_band: number;
  lexical_resource_band: number;
  grammar_band: number;
  pronunciation_band: number;
  fluency_feedback: string;
  vocabulary_feedback: string;
  grammar_feedback: string;
  pronunciation_feedback: string;
  corrected_answer: string;
  stronger_sample_answer: string;
  three_speaking_drills: string[];
}

const FILLERS = /\b(um+|uh+|er+|ah+|like|you know|i mean|sort of|kind of)\b/gi;

function useRecognition(onText: (t: string) => void) {
  const recRef = useRef<any>(null);
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e: any) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript + " ";
      }
      if (final) onText(final);
    };
    r.onend = () => setActive(false);
    recRef.current = r;
  }, [onText]);

  return {
    supported,
    active,
    start: () => {
      try { recRef.current?.start(); setActive(true); } catch { /* already running */ }
    },
    stop: () => { try { recRef.current?.stop(); } catch {} setActive(false); },
  };
}

function speak(text: string) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function SpeakingPractice() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [part, setPart] = useState<Part>(1);
  const [mat, setMat] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [qIdx, setQIdx] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [marking, setMarking] = useState<Marking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prepLeft, setPrepLeft] = useState(60);
  const [speakLeft, setSpeakLeft] = useState(120);
  const [phase, setPhase] = useState<"idle" | "prep" | "speaking" | "done">("idle");

  const rec = useRecognition((t) => setTranscript((p) => (p + t).trim() + " "));

  useEffect(() => {
    void load(part);
    return () => window.speechSynthesis?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  // Part 2 timers
  useEffect(() => {
    if (part !== 2) return;
    if (phase === "prep") {
      const id = setInterval(() => {
        setPrepLeft((s) => {
          if (s <= 1) { clearInterval(id); startSpeaking(); return 0; }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    if (phase === "speaking") {
      const id = setInterval(() => {
        setSpeakLeft((s) => {
          if (s <= 1) { clearInterval(id); finishSpeaking(); return 0; }
          return s - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, part]);

  async function load(p: Part) {
    setLoading(true);
    setMat(null);
    setQIdx(0);
    setTranscript("");
    setMarking(null);
    setPhase("idle");
    setPrepLeft(60);
    setSpeakLeft(120);
    rec.stop();
    const r = await ai({ data: { task: "speaking_prompt", payload: { part: p } } });
    if (r.error) toast.error(r.error);
    else setMat(r.result as Material);
    setLoading(false);
  }

  function startSpeaking() {
    setPhase("speaking");
    setTranscript("");
    rec.start();
  }
  function finishSpeaking() {
    rec.stop();
    setPhase("done");
  }

  async function submit() {
    if (!user || !mat) return;
    if (transcript.trim().length < 20) { toast.warning("Please speak a bit more before submitting."); return; }
    setSubmitting(true);
    const fillerCount = (transcript.match(FILLERS) || []).length;
    const question =
      mat.part === 2
        ? `Cue card: ${mat.cue_card.topic}\nPoints: ${mat.cue_card.points.join("; ")}`
        : (mat as Part1 | Part3).questions[qIdx];

    const r = await ai({
      data: {
        task: "speaking",
        payload: {
          part: mat.part,
          question,
          cue_card: mat.part === 2 ? mat.cue_card : null,
          transcript,
          duration_seconds: mat.part === 2 ? 120 - speakLeft : null,
          filler_count: fillerCount,
        },
      },
    });
    if (r.error || !r.result) { toast.error(r.error ?? "Marking failed"); setSubmitting(false); return; }
    const m = r.result as Marking;
    setMarking(m);
    await supabase.from("speaking_submissions").insert({
      user_id: user.id,
      part: mat.part,
      question,
      cue_card: mat.part === 2 ? (mat.cue_card as any) : null,
      transcript,
      duration_seconds: mat.part === 2 ? 120 - speakLeft : null,
      filler_count: fillerCount,
      marking: m as any,
      estimated_band: m.estimated_band,
    });
    setSubmitting(false);
  }

  if (marking) return <SpeakingResult m={marking} onRetry={() => load(part)} />;

  return (
    <div>
      <PageHeader title="Speaking Simulator" subtitle={`Part ${part} • Examiner mode`} back="/practice" />

      <div className="mt-4 flex gap-2">
        {[1, 2, 3].map((p) => (
          <button
            key={p}
            onClick={() => setPart(p as Part)}
            className={`flex-1 h-9 rounded-lg text-xs font-medium border transition ${
              part === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            Part {p}
          </button>
        ))}
      </div>

      {!rec.supported && (
        <p className="mt-4 text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">
          Microphone speech recognition isn't supported in this browser. Use Chrome / Edge for the full experience.
        </p>
      )}

      {loading || !mat ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Preparing examiner…
        </div>
      ) : mat.part === 1 ? (
        <Part1Or3 mat={mat} qIdx={qIdx} setQIdx={setQIdx} transcript={transcript} setTranscript={setTranscript} rec={rec} />
      ) : mat.part === 3 ? (
        <Part1Or3 mat={mat} qIdx={qIdx} setQIdx={setQIdx} transcript={transcript} setTranscript={setTranscript} rec={rec} />
      ) : (
        <CueCardPart
          cue={mat.cue_card}
          phase={phase}
          startPrep={() => setPhase("prep")}
          prepLeft={prepLeft}
          speakLeft={speakLeft}
          transcript={transcript}
          rec={rec}
          finish={finishSpeaking}
        />
      )}

      {!loading && mat && (phase === "done" || mat.part !== 2) && (
        <button
          disabled={submitting || transcript.trim().length < 20}
          onClick={submit}
          className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Marking…</> : <><Sparkles className="h-4 w-4" /> Submit for AI marking</>}
        </button>
      )}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}

function Part1Or3({
  mat, qIdx, setQIdx, transcript, setTranscript, rec,
}: {
  mat: Part1 | Part3;
  qIdx: number; setQIdx: (n: number) => void;
  transcript: string; setTranscript: (s: string) => void;
  rec: ReturnType<typeof useRecognition>;
}) {
  const q = mat.questions[qIdx];
  return (
    <>
      <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground">
        <p className="text-[11px] uppercase tracking-wide opacity-80">Examiner — Part {mat.part}</p>
        <p className="mt-2 text-base leading-relaxed">{q}</p>
        <button onClick={() => speak(q)} className="mt-3 inline-flex items-center gap-1 text-xs underline opacity-90">
          <Volume2 className="h-3.5 w-3.5" /> Hear question
        </button>
      </section>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setQIdx(Math.max(0, qIdx - 1))}
          disabled={qIdx === 0}
          className="flex-1 h-9 rounded-lg border border-border text-xs font-medium disabled:opacity-50"
        >Previous</button>
        <span className="px-3 text-xs flex items-center text-muted-foreground">{qIdx + 1} / {mat.questions.length}</span>
        <button
          onClick={() => setQIdx(Math.min(mat.questions.length - 1, qIdx + 1))}
          disabled={qIdx === mat.questions.length - 1}
          className="flex-1 h-9 rounded-lg border border-border text-xs font-medium disabled:opacity-50"
        >Next</button>
      </div>

      <MicPad transcript={transcript} setTranscript={setTranscript} rec={rec} />
    </>
  );
}

function CueCardPart({
  cue, phase, startPrep, prepLeft, speakLeft, transcript, rec, finish,
}: {
  cue: { topic: string; points: string[] };
  phase: "idle" | "prep" | "speaking" | "done";
  startPrep: () => void;
  prepLeft: number; speakLeft: number;
  transcript: string;
  rec: ReturnType<typeof useRecognition>;
  finish: () => void;
}) {
  return (
    <>
      <section className="mt-4 rounded-2xl border-2 border-gold bg-card p-5 shadow-[var(--shadow-card)]">
        <p className="text-[11px] uppercase tracking-wide text-gold">Cue Card</p>
        <p className="mt-2 font-display text-lg font-semibold">{cue.topic}</p>
        <p className="text-xs text-muted-foreground mt-2">You should say:</p>
        <ul className="mt-1 list-disc pl-5 space-y-1 text-sm">
          {cue.points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <p className="text-[11px] text-muted-foreground mt-3">
          1 minute to prepare • 1–2 minutes to speak
        </p>
      </section>

      {phase === "idle" && (
        <button onClick={startPrep} className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2">
          <Clock className="h-4 w-4" /> Start 1-min preparation
        </button>
      )}

      {phase === "prep" && (
        <section className="mt-5 rounded-2xl border border-warning/40 bg-warning/5 p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-warning">Preparation</p>
          <p className="font-display text-5xl font-semibold mt-2 tabular-nums">{prepLeft}s</p>
          <p className="text-xs text-muted-foreground mt-2">Make notes mentally. Speaking starts automatically.</p>
        </section>
      )}

      {phase === "speaking" && (
        <>
          <section className="mt-5 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-destructive">Speaking — recording</p>
            <p className="font-display text-5xl font-semibold mt-2 tabular-nums">{Math.floor(speakLeft / 60)}:{String(speakLeft % 60).padStart(2, "0")}</p>
          </section>
          <MicPad transcript={transcript} setTranscript={() => {}} rec={rec} live />
          <button onClick={finish} className="mt-4 h-11 w-full rounded-xl border border-border text-sm">Finish early</button>
        </>
      )}

      {phase === "done" && <MicPad transcript={transcript} setTranscript={() => {}} rec={rec} />}
    </>
  );
}

function MicPad({
  transcript, setTranscript, rec, live,
}: {
  transcript: string;
  setTranscript: (s: string) => void;
  rec: ReturnType<typeof useRecognition>;
  live?: boolean;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Your transcript</p>
        {!live && (
          <button
            disabled={!rec.supported}
            onClick={() => (rec.active ? rec.stop() : rec.start())}
            className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 ${rec.active ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
          >
            {rec.active ? <><MicOff className="h-3.5 w-3.5" /> Stop</> : <><Mic className="h-3.5 w-3.5" /> Record</>}
          </button>
        )}
      </div>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        placeholder={rec.supported ? "Press Record and speak. Edit if needed." : "Type your spoken answer here…"}
        className="mt-3 w-full min-h-[120px] rounded-lg border border-input bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <p className="mt-1 text-[11px] text-muted-foreground">{transcript.trim().split(/\s+/).filter(Boolean).length} words</p>
    </section>
  );
}

function SpeakingResult({ m, onRetry }: { m: Marking; onRetry: () => void }) {
  return (
    <div>
      <PageHeader title="Speaking — Result" back="/practice" />
      <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground text-center">
        <p className="text-xs uppercase tracking-wide opacity-80">Estimated band</p>
        <p className="font-display text-6xl font-semibold text-gradient-gold mt-1">{m.estimated_band}</p>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Crit label="Fluency & Coherence" v={m.fluency_coherence_band} />
        <Crit label="Lexical Resource" v={m.lexical_resource_band} />
        <Crit label="Grammar" v={m.grammar_band} />
        <Crit label="Pronunciation" v={m.pronunciation_band} />
      </section>

      <Block title="Fluency feedback">{m.fluency_feedback}</Block>
      <Block title="Vocabulary feedback">{m.vocabulary_feedback}</Block>
      <Block title="Grammar feedback">{m.grammar_feedback}</Block>
      <Block title="Pronunciation feedback">{m.pronunciation_feedback}</Block>
      <Block title="Polished version">{m.corrected_answer}</Block>
      <Block title="Band 8/9 sample answer">{m.stronger_sample_answer}</Block>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold mb-2">Speaking drills</p>
        <ol className="list-decimal pl-5 text-sm space-y-1">
          {m.three_speaking_drills?.map((d, i) => <li key={i}>{d}</li>)}
        </ol>
      </section>

      <button onClick={onRetry} className="mt-6 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium">New question</button>
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
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold mb-2">{title}</p>
      <p className="text-sm whitespace-pre-line leading-relaxed">{children}</p>
    </section>
  );
}
