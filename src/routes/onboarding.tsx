import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SKILLS, ACCENTS, PLAN_LENGTHS } from "@/lib/ielts";
import { toast } from "sonner";
import { ChevronRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login" });
  },
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    full_name: "",
    target_band: 7,
    exam_date: "",
    current_band: 6,
    weakest_skill: "Not Sure",
    daily_minutes: 60,
    plan_length: 15,
    preferred_accent: "British",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        const name = (user.user_metadata?.full_name as string) || (user.email?.split("@")[0] ?? "");
        setData((d) => ({ ...d, full_name: d.full_name || name }));
      }
    });
  }, []);

  const finish = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      ...data,
      onboarded: true,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("All set. Let's get to Band 9.");
    nav({ to: "/dashboard" });
  };

  const steps = [
    {
      title: "What should we call you?",
      content: (
        <input value={data.full_name} onChange={(e) => setData({ ...data, full_name: e.target.value })} placeholder="Full name" className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm" />
      ),
      valid: data.full_name.length > 1,
    },
    {
      title: "What's your target band?",
      content: (
        <div className="grid grid-cols-4 gap-2">
          {[5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9].map((b) => (
            <button key={b} onClick={() => setData({ ...data, target_band: b })} className={`h-12 rounded-xl border text-sm font-semibold transition ${data.target_band === b ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{b}</button>
          ))}
        </div>
      ),
      valid: !!data.target_band,
    },
    {
      title: "When is your exam?",
      content: (
        <input type="date" value={data.exam_date} onChange={(e) => setData({ ...data, exam_date: e.target.value })} className="h-12 w-full rounded-xl border border-input bg-background px-4 text-sm" />
      ),
      valid: !!data.exam_date,
    },
    {
      title: "Current estimated band?",
      content: (
        <div className="grid grid-cols-4 gap-2">
          {[4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5].map((b) => (
            <button key={b} onClick={() => setData({ ...data, current_band: b })} className={`h-12 rounded-xl border text-sm font-semibold transition ${data.current_band === b ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{b}</button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: "Which skill is weakest?",
      content: (
        <div className="grid grid-cols-1 gap-2">
          {SKILLS.map((s) => (
            <button key={s} onClick={() => setData({ ...data, weakest_skill: s })} className={`h-12 rounded-xl border text-sm font-medium transition text-left px-4 ${data.weakest_skill === s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{s}</button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: "Daily study time?",
      content: (
        <div className="grid grid-cols-3 gap-2">
          {[30, 60, 90, 120, 150, 180].map((m) => (
            <button key={m} onClick={() => setData({ ...data, daily_minutes: m })} className={`h-14 rounded-xl border text-sm font-semibold transition ${data.daily_minutes === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{m} min</button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: "Pick your study plan",
      content: (
        <div className="grid grid-cols-3 gap-2">
          {PLAN_LENGTHS.map((d) => (
            <button key={d} onClick={() => setData({ ...data, plan_length: d })} className={`h-20 rounded-xl border flex flex-col items-center justify-center transition ${data.plan_length === d ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
              <span className="font-display text-2xl font-semibold">{d}</span>
              <span className="text-xs opacity-80">days</span>
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: "Preferred listening accent",
      content: (
        <div className="grid grid-cols-2 gap-2">
          {ACCENTS.map((a) => (
            <button key={a} onClick={() => setData({ ...data, preferred_accent: a })} className={`h-12 rounded-xl border text-sm font-medium transition ${data.preferred_accent === a ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{a}</button>
          ))}
        </div>
      ),
      valid: true,
    },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pt-10 pb-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl gradient-hero grid place-items-center text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display font-semibold">Band9 Coach</span>
        </div>

        <div className="flex gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">Step {step + 1} of {steps.length}</p>
        <h2 className="font-display text-2xl font-semibold mt-2 mb-6">{cur.title}</h2>

        <div>{cur.content}</div>

        <div className="mt-10 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="h-12 px-5 rounded-xl border border-border font-medium">Back</button>
          )}
          <button
            disabled={!cur.valid || saving}
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {last ? (saving ? "Saving…" : "Finish") : "Continue"}
            {!last && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
