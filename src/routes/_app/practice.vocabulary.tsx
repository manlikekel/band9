import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useServerFn } from "@tanstack/react-start";
import { aiMark } from "@/lib/ai.functions";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/practice/vocabulary")({ component: VocabPractice });

const TOPICS = ["Work & Career", "Education", "Environment", "Health", "Technology", "Travel", "Family", "Society"];

interface VocabItem {
  word: string;
  part_of_speech: string;
  meaning: string;
  example: string;
  collocations: string[];
  synonyms: string[];
}

function VocabPractice() {
  const ai = useServerFn(aiMark);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<VocabItem[]>([]);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  async function load(t = topic) {
    setLoading(true);
    setItems([]);
    setRevealed({});
    const r = await ai({
      data: {
        task: "generate_questions",
        payload: {
          section: "vocabulary",
          topic: t,
          instruction: `Generate 8 IELTS Band 7-8 vocabulary items for the topic "${t}". Return JSON with key "items" as an array of { word, part_of_speech, meaning, example, collocations (array of 3 strings), synonyms (array of 3 strings) }.`,
        },
      },
    });
    if (r.error) toast.error(r.error);
    else setItems(((r.result as any)?.items ?? []) as VocabItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void load(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Vocabulary" subtitle="Topic-based Band 7+ words" back="/practice" />

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
          <Loader2 className="h-4 w-4 animate-spin" /> Generating vocabulary…
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((it, i) => {
            const open = revealed[i];
            return (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold">{it.word}</p>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{it.part_of_speech}</p>
                  </div>
                  <button
                    onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
                    className="text-xs px-3 h-8 rounded-lg border border-border"
                  >
                    {open ? "Hide" : "Reveal"}
                  </button>
                </div>
                {open && (
                  <div className="mt-3 space-y-2 text-sm">
                    <p>{it.meaning}</p>
                    <p className="text-muted-foreground italic">“{it.example}”</p>
                    {it.collocations?.length > 0 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Collocations: </span>
                        {it.collocations.join(", ")}
                      </p>
                    )}
                    {it.synonyms?.length > 0 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Synonyms: </span>
                        {it.synonyms.join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => load()}
        disabled={loading}
        className="mt-5 h-11 w-full rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        New set
      </button>

      <AiDisclaimer className="mt-5" />
    </div>
  );
}
