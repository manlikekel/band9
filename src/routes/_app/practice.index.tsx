import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { Headphones, BookOpen, PenLine, FileText, Mic, Library, BookA, RotateCcw, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_app/practice/")({ component: PracticeHub });

const featured = [
  { to: "/practice/listening", icon: Headphones, title: "Listening", desc: "Form, table, MCQ, map", kind: "cream" as const },
  { to: "/practice/reading", icon: BookOpen, title: "Reading", desc: "T/F/NG, headings, gap-fill", kind: "gold" as const },
];

const writing = [
  { to: "/practice/writing-task1", icon: PenLine, title: "Writing T1", desc: "Letter · 150+" },
  { to: "/practice/writing-task2", icon: FileText, title: "Writing T2", desc: "Essay · 250+" },
];

const drills = [
  { to: "/practice/speaking", icon: Mic, title: "Speaking", desc: "Parts 1 · 2 · 3" },
  { to: "/practice/vocabulary", icon: Library, title: "Vocabulary", desc: "Topic & collocations" },
  { to: "/practice/grammar", icon: BookA, title: "Grammar", desc: "Sentence drills" },
  { to: "/practice/wrong", icon: RotateCcw, title: "Retry Wrong", desc: "Saved mistakes" },
];

function PracticeHub() {
  return (
    <div>
      <PageHeader title="Practice" subtitle="Skills · Drills" />

      {/* Featured */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        {featured.map(({ to, icon: Icon, title, desc, kind }) => (
          <Link
            key={to}
            to={to as any}
            className={`relative overflow-hidden p-5 min-h-[160px] flex flex-col justify-between active:scale-[0.99] transition ${
              kind === "cream" ? "tile-cream" : "tile-gold"
            }`}
          >
            <div className={`h-10 w-10 rounded-xl grid place-items-center ${
              kind === "cream" ? "bg-cream-foreground text-gold" : "bg-gold-foreground/10 text-gold-foreground"
            }`}>
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                kind === "cream" ? "text-cream-foreground/60" : "text-gold-foreground/70"
              }`}>Skill</p>
              <p className="font-display text-2xl leading-tight mt-0.5">{title}</p>
              <p className={`text-[11px] mt-1 ${
                kind === "cream" ? "text-cream-foreground/70" : "text-gold-foreground/80"
              }`}>{desc}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* Writing pair */}
      <p className="eyebrow mt-6">Writing</p>
      <section className="mt-2 grid grid-cols-2 gap-3">
        {writing.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to as any}
            className="tile p-4 flex flex-col gap-3 active:scale-[0.99] transition hover:border-gold/40"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-5 w-5 text-gold" strokeWidth={2.2} />
              <ArrowUpRight className="h-4 w-4 text-foreground/40" />
            </div>
            <div>
              <p className="font-display text-lg leading-tight">{title}</p>
              <p className="text-[11px] text-foreground/60 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </section>

      {/* Drills list */}
      <p className="eyebrow mt-6">Drills</p>
      <section className="mt-2 grid gap-2">
        {drills.map(({ to, icon: Icon, title, desc }) => (
          <Link
            key={to}
            to={to as any}
            className="tile px-4 py-3.5 flex items-center gap-4 active:scale-[0.99] transition hover:border-gold/40"
          >
            <div className="h-10 w-10 rounded-xl bg-secondary text-gold grid place-items-center">
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base leading-tight">{title}</p>
              <p className="text-[11px] text-foreground/60 mt-0.5">{desc}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-foreground/40" />
          </Link>
        ))}
      </section>

      <AiDisclaimer className="mt-6" />
    </div>
  );
}
