import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { Headphones, BookOpen, PenLine, FileText, Mic, Library, BookA, RotateCcw, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/practice/")({ component: PracticeHub });

const items = [
  { to: "/practice/listening", icon: Headphones, title: "Listening", desc: "Form, table, MCQ, map" },
  { to: "/practice/reading", icon: BookOpen, title: "Reading", desc: "T/F/NG, headings, gap-fill" },
  { to: "/practice/writing-task1", icon: PenLine, title: "Writing Task 1", desc: "Letter, 150+ words" },
  { to: "/practice/writing-task2", icon: FileText, title: "Writing Task 2", desc: "Essay, 250+ words" },
  { to: "/practice/speaking", icon: Mic, title: "Speaking", desc: "Parts 1, 2, 3" },
  { to: "/practice/vocabulary", icon: Library, title: "Vocabulary", desc: "Topic, synonyms, collocations" },
  { to: "/practice/grammar", icon: BookA, title: "Grammar", desc: "Sentence drills" },
  { to: "/practice/wrong", icon: RotateCcw, title: "Retry Wrong", desc: "Saved mistakes" },
];

function PracticeHub() {
  return (
    <div>
      <PageHeader title="Practice" subtitle="Choose a skill or drill to focus on" />
      <div className="mt-4 grid gap-3">
        {items.map(({ to, icon: Icon, title, desc }) => (
          <Link key={to} to={to as any} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4 shadow-[var(--shadow-card)] active:scale-[0.99] transition">
            <div className="h-11 w-11 rounded-xl bg-secondary text-primary grid place-items-center">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
      <AiDisclaimer className="mt-6" />
    </div>
  );
}
