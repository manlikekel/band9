import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QuestionRenderer, gradeAnswers, rawToBand, type IELTSQuestion } from "@/components/QuestionRenderer";
import { Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { bandColor } from "@/lib/ielts";

export const Route = createFileRoute("/_app/practice/reading")({ component: ReadingPractice });

interface Material {
  instructions: string;
  passage: string;
  passage_title?: string;
  questions: IELTSQuestion[];
}

function ReadingPractice() {
  const { user } = useAuth();
  const ai = useServerFn(aiMark);
  const [loading, setLoading] = useState(true);
  const [mat, setMat] = useState<Material | null>(null);
  const [section, setSection] = useState<1 | 2 | 3>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<{ raw: number; band: number } | null>(null);
  const [seconds, setSeconds] = useState(20 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    void load(section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    if (!running || submitted) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running, submitted]);

  async function load(s: number) {
    setLoading(true);
    setMat(null);
    setAnswers({});
    setSubmitted(null);
    setSeconds(20 * 60);
    setRunning(false);
    const instruction =
      s === 1
        ? "Section 1: short factual texts (notices/ads). Mix of True/False/Not Given and sentence completion. Generate ONE passage of 200-280 words and 13-14 questions."
        : s === 2
          ? "Section 2: workplace text (policies/employment). Mix of multiple choice, matching headings, and note completion. ~280-360 word passage, 13 questions."
          : "Section 3: longer descriptive text on a general topic (~600-800 words). Mix of T/F/NG, summary completion, matching information. 13-14 questions.";
    const r = await ai({
      data: {
        task: "generate_questions",
        payload: { section: "reading", part: s, instruction, difficulty: "5.5-7.5" },
      },
    });
    if (r.error) toast.error(r.error);
    else setMat(r.result as Material);
    setLoading(false);
  }

  async function submit() {
    if (!mat || !user) return;
    setRunning(false);
    const { correct, total, breakdown } = gradeAnswers(mat.questions, answers);
    const band = rawToBand(correct, total);
    setSubmitted({ raw: correct, band });
    await supabase.from("practice_sessions").insert({
      user_id: user.id,
      section: "reading",
      question_type: `section_${section}`,
      payload: mat as any,
      user_answers: answers as any,
      marking: { breakdown, raw: correct, total } as any,
      raw_score: correct,
      estimated_band: band,
      duration_seconds: 20 * 60 - seconds,
    });
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div>
      <PageHeader
        title="Reading Practice"
        subtitle={`Section ${section} • 20 min suggested`}
        back="/practice"
        right={
          <div className="flex items-center gap-1 text-sm font-mono">
            <Clock className="h-4 w-4" />
            {mm}:{ss}
          </div>
        }
      />

      <div className="mt-4 flex gap-2">
        {[1, 2, 3].map((s) => (
          <button
            key={s}
            onClick={() => setSection(s as 1 | 2 | 3)}
            className={`flex-1 h-9 rounded-lg text-xs font-medium border transition ${
              section === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            Section {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating Section {section} passage & questions…
        </div>
      ) : mat ? (
        <>
          <section
            onClick={() => !running && !submitted && setRunning(true)}
            className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] max-h-[55vh] overflow-y-auto"
          >
            {mat.passage_title && (
              <h2 className="font-display text-lg font-semibold mb-2">{mat.passage_title}</h2>
            )}
            <p className="text-sm whitespace-pre-line leading-relaxed">{mat.passage}</p>
          </section>

          <p className="mt-4 text-xs italic text-muted-foreground">{mat.instructions}</p>

          <section className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <QuestionRenderer
              questions={mat.questions}
              answers={answers}
              onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
              disabled={!!submitted}
              showAnswers={!!submitted}
            />
          </section>

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
                onClick={() => load(section)}
                className="mt-4 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium"
              >
                New Section {section} set
              </button>
            </section>
          ) : (
            <button
              onClick={submit}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" /> Submit answers
            </button>
          )}
        </>
      ) : null}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
