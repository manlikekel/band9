import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Sparkles, Target, Mic, PenLine, Headphones, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md px-5 pt-12 pb-24">
        <div className="flex items-center gap-2 mb-10">
          <div className="h-9 w-9 rounded-xl gradient-hero grid place-items-center text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold">Band9 Coach</span>
        </div>

        <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight">
          Your <span className="text-gradient-gold">IELTS General</span> exam command center.
        </h1>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Practice listening, reading, writing and speaking with AI marking. Full mock exams.
          Personalised study plans. Built for serious test-takers.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/signup"
            className="h-12 rounded-xl bg-primary text-primary-foreground font-medium grid place-items-center shadow-[var(--shadow-card)] active:scale-[0.99] transition"
          >
            Start practising free
          </Link>
          <Link to="/login" className="h-12 rounded-xl border border-border font-medium grid place-items-center hover:bg-muted transition">
            I already have an account
          </Link>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          {[
            { i: Headphones, t: "Listening", s: "Form, table, map, MCQ" },
            { i: BookOpen, t: "Reading", s: "T/F/NG, headings, gap-fill" },
            { i: PenLine, t: "Writing", s: "Letter + essay AI marking" },
            { i: Mic, t: "Speaking", s: "Parts 1–3 with transcript" },
          ].map(({ i: Icon, t, s }) => (
            <div key={t} className="rounded-2xl bg-card border border-border p-4 shadow-[var(--shadow-card)]">
              <Icon className="h-5 w-5 text-primary" />
              <p className="mt-3 font-semibold text-sm">{t}</p>
              <p className="text-xs text-muted-foreground">{s}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border p-5 bg-secondary/40">
          <Target className="h-5 w-5 text-gold" />
          <p className="mt-3 font-display text-lg font-semibold">From Band 5 to Band 8 in 30 days.</p>
          <p className="text-sm text-muted-foreground mt-1">
            A 7, 15 or 30-day plan based on your weakest skill, exam date, and target band.
          </p>
          <Link to="/signup" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Build my plan <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-10 text-[11px] text-muted-foreground leading-relaxed text-center">
          Scores are AI-estimated practice bands. Official IELTS scores can only be awarded by official IELTS examiners.
        </p>
      </main>
    </div>
  );
}
