import { Input } from "@/components/ui/input";

export interface IELTSQuestion {
  id: string | number;
  type: string; // multiple_choice | true_false_not_given | yes_no_not_given | short_answer | sentence_completion | matching | form_completion | note_completion
  prompt: string;
  options?: string[];
  correct_answer: string | string[];
  alternatives?: string[];
  evidence?: string;
  explanation?: string;
}

export function QuestionRenderer({
  questions,
  answers,
  onChange,
  disabled,
  showAnswers,
}: {
  questions: IELTSQuestion[];
  answers: Record<string, string>;
  onChange: (id: string, v: string) => void;
  disabled?: boolean;
  showAnswers?: boolean;
}) {
  return (
    <ol className="space-y-5">
      {questions.map((q, i) => {
        const id = String(q.id ?? i + 1);
        const v = answers[id] ?? "";
        const correct = Array.isArray(q.correct_answer)
          ? q.correct_answer.join(" / ")
          : q.correct_answer;
        const tfng = q.type === "true_false_not_given";
        const ynng = q.type === "yes_no_not_given";
        const isMC = q.type === "multiple_choice" || (Array.isArray(q.options) && q.options.length > 0 && !tfng && !ynng);

        return (
          <li key={id} className="text-sm">
            <p className="font-medium leading-relaxed">
              <span className="text-primary mr-2">{i + 1}.</span>
              {q.prompt}
            </p>

            <div className="mt-2">
              {tfng || ynng ? (
                <div className="flex flex-wrap gap-2">
                  {(tfng ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"]).map((opt) => (
                    <button
                      key={opt}
                      disabled={disabled}
                      onClick={() => onChange(id, opt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        v === opt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : isMC ? (
                <div className="space-y-1.5">
                  {q.options!.map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const selected = v === letter || v === opt;
                    return (
                      <button
                        key={oi}
                        disabled={disabled}
                        onClick={() => onChange(id, letter)}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-xs leading-relaxed transition ${
                          selected
                            ? "bg-primary/10 border-primary"
                            : "bg-background border-border hover:border-primary/50"
                        }`}
                      >
                        <span className="font-semibold mr-2">{letter}.</span>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  disabled={disabled}
                  value={v}
                  onChange={(e) => onChange(id, e.target.value)}
                  placeholder="Type your answer…"
                  className="h-9"
                />
              )}
            </div>

            {showAnswers && (
              <div className="mt-2 text-xs space-y-0.5">
                <p className="text-success">Answer: {correct}</p>
                {q.evidence && <p className="text-muted-foreground italic">“{q.evidence}”</p>}
                {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function gradeAnswers(qs: IELTSQuestion[], a: Record<string, string>) {
  let correct = 0;
  const breakdown: { id: string; correct: boolean; user: string; expected: string }[] = [];
  qs.forEach((q, i) => {
    const id = String(q.id ?? i + 1);
    const user = (a[id] ?? "").trim();
    const alts = Array.isArray(q.alternatives)
      ? q.alternatives
      : q.alternatives
        ? [q.alternatives as unknown as string]
        : [];
    const accept = [
      ...(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]),
      ...alts,
    ]
      .filter(Boolean)
      .map((s) => String(s).trim().toLowerCase());
    const ok = accept.includes(user.toLowerCase());
    if (ok) correct++;
    breakdown.push({
      id,
      correct: ok,
      user,
      expected: Array.isArray(q.correct_answer) ? q.correct_answer.join(" / ") : String(q.correct_answer),
    });
  });
  return { correct, total: qs.length, breakdown };
}

// IELTS raw → band approximation (Listening/Reading General)
export function rawToBand(raw: number, total = 40): number {
  const pct = raw / total;
  if (pct >= 0.95) return 9;
  if (pct >= 0.875) return 8.5;
  if (pct >= 0.825) return 8;
  if (pct >= 0.75) return 7.5;
  if (pct >= 0.7) return 7;
  if (pct >= 0.6) return 6.5;
  if (pct >= 0.5) return 6;
  if (pct >= 0.4) return 5.5;
  if (pct >= 0.3) return 5;
  if (pct >= 0.2) return 4.5;
  return 4;
}
