import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/practice/grammar")({ component: GrammarPractice });

const TOPICS = [
  "Tenses",
  "Articles",
  "Prepositions",
  "Conditionals",
  "Passive voice",
  "Reported speech",
  "Relative clauses",
  "Subject–verb agreement",
];

interface Drill {
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

function GrammarPractice() {
  const ai = useServerFn(aiMark);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [loading, setLoading] = useState(false);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  async function load(t = topic) {
    setLoading(true);
    setDrills([]);
    setAnswers({});
    setSubmitted(false);
    const r = await ai({
      data: {
        task: "generate_questions",
        payload: {
          section: "grammar",
          topic: t,
          instruction: `Generate 10 IELTS-style multiple-choice grammar drills on "${t}". Return JSON with key "drills" as an array of { prompt (sentence with a ___ blank or error to fix), options (4 strings), correct_index (0-3), explanation }.`,
        },
      },
    });
    if (r.error) toast.error(r.error);
    else setDrills(((r.result as any)?.drills ?? []) as Drill[]);
    setLoading(false);
  }

  useEffect(() => {
    void load(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = drills.filter((d, i) => answers[i] === d.correct_index).length;

  return (
    <div>
      <PageHeader title="Grammar" subtitle="Targeted drills with explanations" back="/practice" />

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TOPICS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTopic(t);
              void load(t);
            }}
            className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition ${
              topic === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Generating drills…
        </div>
      ) : (
        <ol className="mt-4 space-y-4">
          {drills.map((d, i) => {
            const sel = answers[i];
            return (
              <li key={i} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-medium">
                  <span className="text-primary mr-2">{i + 1}.</span>
                  {d.prompt}
                </p>
                <div className="mt-2 space-y-1.5">
                  {d.options.map((o, oi) => {
                    const isSel = sel === oi;
                    const isRight = submitted && oi === d.correct_index;
                    const isWrong = submitted && isSel && oi !== d.correct_index;
                    return (
                      <button
                        key={oi}
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition ${
                          isRight
                            ? "bg-success/10 border-success text-success"
                            : isWrong
                              ? "bg-destructive/10 border-destructive text-destructive"
                              : isSel
                                ? "bg-primary/10 border-primary"
                                : "bg-background border-border"
                        }`}
                      >
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                        {o}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <p className="mt-2 text-xs text-muted-foreground italic">{d.explanation}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {drills.length > 0 && !submitted && (
        <button
          onClick={() => setSubmitted(true)}
          className="mt-5 h-12 w-full rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" /> Check answers
        </button>
      )}

      {submitted && (
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Score</p>
          <p className="font-display text-3xl font-semibold mt-1">
            {score} / {drills.length}
          </p>
          <button
            onClick={() => load()}
            className="mt-4 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> New drills
          </button>
        </div>
      )}

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
