import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { ACCENTS } from "@/lib/ielts";
import { LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

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
      <PageHeader title="Settings" />
      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-semibold">Profile</p>
        <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
        <input value={p?.full_name ?? ""} onChange={(e) => update({ full_name: e.target.value })} placeholder="Full name" className="mt-3 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 grid gap-3">
        <p className="text-sm font-semibold">Exam goals</p>
        <label className="text-xs text-muted-foreground">Target band
          <input type="number" step="0.5" min="4" max="9" value={p?.target_band ?? ""} onChange={(e) => update({ target_band: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
        </label>
        <label className="text-xs text-muted-foreground">Exam date
          <input type="date" value={p?.exam_date ?? ""} onChange={(e) => update({ exam_date: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
        </label>
        <label className="text-xs text-muted-foreground">Daily minutes
          <input type="number" value={p?.daily_minutes ?? 60} onChange={(e) => update({ daily_minutes: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm" />
        </label>
        <label className="text-xs text-muted-foreground">Preferred accent
          <select value={p?.preferred_accent ?? "British"} onChange={(e) => update({ preferred_accent: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm">
            {ACCENTS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Appearance</p>
          <p className="text-xs text-muted-foreground">Light / dark mode</p>
        </div>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="h-11 w-11 rounded-xl border border-border bg-background grid place-items-center">
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </section>

      <button onClick={async () => { await signOut(); toast.success("Signed out"); nav({ to: "/" }); }} className="mt-6 h-12 w-full rounded-xl border border-destructive text-destructive font-medium flex items-center justify-center gap-2">
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </div>
  );
}
