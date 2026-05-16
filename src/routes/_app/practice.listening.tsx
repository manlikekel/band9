import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QuestionRenderer, gradeAnswers, rawToBand, type IELTSQuestion } from "@/components/QuestionRenderer";
import { Headphones, Loader2, Play, Pause, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { bandColor } from "@/lib/ielts";

export const Route = createFileRoute("/_app/practice/listening")({ component: ListeningPractice });

interface Material {
  instructions: string;
  transcript: string;
  questions: IELTSQuestion[];
  context?: string; // e.g. setting
}

function ListeningPractice() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [loading, setLoading] = useState(true);
  const [mat, setMat] = useState<Material | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [submitted, setSubmitted] = useState<{ raw: number; band: number } | null>(null);
  const [part, setPart] = useState<1 | 2 | 3 | 4>(1);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    void load(part);
    return () => window.speechSynthesis?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part]);

  async function load(p: number) {
    setLoading(true);
    setMat(null);
    setAnswers({});
    setPlayed(false);
    setSubmitted(null);
    const r = await ai({
      data: {
        task: "generate_questions",
        payload: {
          section: "listening",
          part: p,
          count: 10,
          instruction:
            p === 1
              ? "Conversation between two speakers about a social situation (form/note completion)."
              : p === 2
                ? "Monologue about a social topic (multiple choice + map/plan labelling style)."
                : p === 3
                  ? "Conversation between 2-4 students/colleagues about an academic task (multiple choice + matching)."
                  : "Academic monologue / lecture (sentence + summary completion).",
          difficulty: "5.5-7.5",
        },
      },
    });
    if (r.error) {
      toast.error(r.error);
    } else {
      setMat(r.result as Material);
    }
    setLoading(false);
  }

  function play() {
    if (!mat) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(mat.transcript);
    u.rate = 0.95;
    u.pitch = 1;
    u.onend = () => {
      setPlaying(false);
      setPlayed(true);
    };
    u.onerror = () => setPlaying(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setPlaying(true);
  }
  function pause() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  async function submit() {
    if (!mat || !user) return;
    const { correct, total, breakdown } = gradeAnswers(mat.questions, answers);
    const band = rawToBand(correct, total);
    setSubmitted({ raw: correct, band });
    await supabase.from("practice_sessions").insert({
      user_id: user.id,
      section: "listening",
      question_type: `part_${part}`,
      payload: mat as any,
      user_answers: answers as any,
      marking: { breakdown, raw: correct, total } as any,
      raw_score: correct,
      estimated_band: band,
    });
  }

  return (
    <div>
      <PageHeader title="Listening Practice" subtitle={`Part ${part} of 4 • 10 questions`} back="/practice" />

      <div className="mt-4 flex gap-2">
        {[1, 2, 3, 4].map((p) => (
          <button
            key={p}
            onClick={() => setPart(p as 1 | 2 | 3 | 4)}
            className={`flex-1 h-9 rounded-lg text-xs font-medium border transition ${
              part === p ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            Part {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating original Part {part} listening…
        </div>
      ) : mat ? (
        <>
          {/* Audio player */}
          <section className="mt-4 rounded-2xl gradient-hero p-5 text-primary-foreground shadow-[var(--shadow-elevated)]">
            <div className="flex items-center gap-3">
              <Headphones className="h-6 w-6" />
              <div className="flex-1">
                <p className="text-xs uppercase opacity-80 tracking-wide">Audio plays once</p>
                <p className="text-sm font-medium mt-0.5">{mat.context ?? `Part ${part}`}</p>
              </div>
              <button
                disabled={played && !playing}
                onClick={playing ? pause : play}
                className="h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-40"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </button>
            </div>
            {played && (
              <p className="mt-3 text-[11px] opacity-80">Audio finished — answer the questions below.</p>
            )}
          </section>

          {/* Instructions */}
          <p className="mt-4 text-xs italic text-muted-foreground">{mat.instructions}</p>

          {/* Questions */}
          <section className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <QuestionRenderer
              questions={mat.questions}
              answers={answers}
              onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
              disabled={!!submitted}
              showAnswers={!!submitted}
            />
          </section>

          {/* Transcript after submit */}
          {submitted && (
            <section className="mt-4 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold mb-2">Transcript</p>
              <p className="text-xs whitespace-pre-line leading-relaxed text-muted-foreground">{mat.transcript}</p>
            </section>
          )}

          {/* Result / submit */}
          {submitted ? (
            <section className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
              <p className="font-display text-3xl font-semibold mt-1">
                {submitted.raw} / {mat.questions.length}
              </p>
              <p className={`font-display text-4xl font-semibold mt-2 ${bandColor(submitted.band)}`}>
                Band {submitted.band}
              </p>
              <button
                onClick={() => load(part)}
                className="mt-4 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium"
              >
                New Part {part} set
              </button>
            </section>
          ) : (
            <button
              disabled={!played}
              onClick={submit}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> {played ? "Submit answers" : "Play audio first"}
            </button>
          )}
        </>
      ) : null}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
