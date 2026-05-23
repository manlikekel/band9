import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ACCENTS } from "@/lib/ielts";
import { LogOut, Moon, Sun, User, Target, Palette } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

const fieldClass =
  "mt-1.5 h-11 w-full rounded-xl border border-border bg-background/40 px-3 text-sm focus:outline-none focus:border-gold/60 focus:bg-background/60 transition";

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const [p, setP] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setP(data));
  }, [user]);

  const update = async (patch: any) => {
    if (!user) return;
    setP({ ...p, ...patch });
    await supabase.from("profiles").update(patch).eq("id", user.id);
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Profile · Goals · Theme" />

      {/* Identity card */}
      <section className="mt-5 tile-cream p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-cream-foreground text-gold grid place-items-center">
          <User className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cream-foreground/60">Account</p>
          <p className="font-display text-lg truncate">{p?.full_name || "Add your name"}</p>
          <p className="text-[11px] text-cream-foreground/70 truncate mt-0.5">{user?.email}</p>
        </div>
      </section>

      <section className="mt-4 tile p-5">
        <p className="eyebrow flex items-center gap-1.5"><User className="h-3 w-3" /> Profile</p>
        <label className="block mt-3 text-[11px] uppercase tracking-wider text-foreground/60">
          Full name
          <input
            value={p?.full_name ?? ""}
            onChange={(e) => update({ full_name: e.target.value })}
            placeholder="e.g. Alex Tan"
            className={fieldClass}
          />
        </label>
      </section>

      <section className="mt-4 tile p-5 grid gap-4">
        <p className="eyebrow flex items-center gap-1.5"><Target className="h-3 w-3" /> Exam Goals</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] uppercase tracking-wider text-foreground/60">
            Target band
            <input
              type="number" step="0.5" min="4" max="9"
              value={p?.target_band ?? ""}
              onChange={(e) => update({ target_band: Number(e.target.value) })}
              className={fieldClass}
            />
          </label>
          <label className="text-[11px] uppercase tracking-wider text-foreground/60">
            Daily minutes
            <input
              type="number"
              value={p?.daily_minutes ?? 60}
              onChange={(e) => update({ daily_minutes: Number(e.target.value) })}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="text-[11px] uppercase tracking-wider text-foreground/60">
          Exam date
          <input
            type="date"
            value={p?.exam_date ?? ""}
            onChange={(e) => update({ exam_date: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="text-[11px] uppercase tracking-wider text-foreground/60">
          Preferred accent
          <select
            value={p?.preferred_accent ?? "British"}
            onChange={(e) => update({ preferred_accent: e.target.value })}
            className={fieldClass}
          >
            {ACCENTS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </section>

      <section className="mt-4 tile p-5 flex items-center justify-between">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Palette className="h-3 w-3" /> Appearance</p>
          <p className="font-display text-base mt-1">{theme === "dark" ? "Dark" : "Light"} mode</p>
        </div>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-12 w-12 rounded-2xl border border-gold/40 bg-card grid place-items-center text-gold hover:bg-gold/10 transition"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </section>

      <button
        onClick={async () => { await signOut(); toast.success("Signed out"); nav({ to: "/" }); }}
        className="mt-6 h-12 w-full rounded-2xl border border-destructive/50 text-destructive font-semibold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-destructive/10 transition"
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
