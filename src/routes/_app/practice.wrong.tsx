import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_app/practice/wrong")({ component: WrongPractice });

interface Session {
  id: string;
  created_at: string;
  section: string;
  question_type: string | null;
  raw_score: number | null;
  estimated_band: number | null;
  marking: any;
  payload: any;
  user_answers: any;
}

function WrongPractice() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("practice_sessions")
        .select("*")
        .eq("user_id", user.id)
        .in("section", ["listening", "reading"])
        .order("created_at", { ascending: false })
        .limit(30);
      setSessions((data ?? []) as Session[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div>
        <PageHeader title="Retry Wrong" back="/practice" />
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading mistakes…
        </div>
      </div>
    );
  }

  const withMistakes = sessions
    .map((s) => {
      const breakdown: { id: string; correct: boolean; user: string; expected: string }[] =
        s.marking?.breakdown ?? [];
      const wrong = breakdown.filter((b) => !b.correct);
      const questions: any[] = s.payload?.questions ?? [];
      const wrongQs = wrong.map((w) => {
        const q = questions.find((qq: any) => String(qq.id ?? "") === w.id) ?? questions[Number(w.id) - 1];
        return { ...w, prompt: q?.prompt ?? "—", evidence: q?.evidence, explanation: q?.explanation };
      });
      return { s, wrongQs };
    })
    .filter((x) => x.wrongQs.length > 0);

  return (
    <div>
      <PageHeader title="Retry Wrong" subtitle="Review your mistakes from Listening & Reading" back="/practice" />

      {withMistakes.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">
          <RotateCcw className="h-8 w-8 mx-auto mb-3 opacity-50" />
          No mistakes yet. Complete a Listening or Reading session first.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {withMistakes.map(({ s, wrongQs }) => {
            const isOpen = open === s.id;
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="w-full text-left p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold capitalize">
                      {s.section} • {s.question_type ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.created_at), "d MMM, HH:mm")} • {wrongQs.length} wrong
                    </p>
                  </div>
                  <span className="text-xs text-primary">{isOpen ? "Hide" : "Review"}</span>
                </button>
                {isOpen && (
                  <ol className="border-t border-border divide-y divide-border">
                    {wrongQs.map((w, i) => (
                      <li key={i} className="p-4 text-sm">
                        <p className="font-medium">{w.prompt}</p>
                        <p className="mt-1 text-xs">
                          <span className="text-muted-foreground">Your answer: </span>
                          <span className="text-destructive">{w.user || "—"}</span>
                        </p>
                        <p className="text-xs">
                          <span className="text-muted-foreground">Correct: </span>
                          <span className="text-success">{w.expected}</span>
                        </p>
                        {w.evidence && (
                          <p className="mt-1 text-xs italic text-muted-foreground">“{w.evidence}”</p>
                        )}
                        {w.explanation && (
                          <p className="mt-1 text-xs text-muted-foreground">{w.explanation}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AiDisclaimer className="mt-6" />
    </div>
  );
}
