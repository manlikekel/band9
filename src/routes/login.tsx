import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    nav({ to: "/dashboard" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (r.error) toast.error(r.error.message);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
      <div className="absolute -bottom-40 -left-20 h-80 w-80 rounded-full bg-secondary/40 blur-3xl" />

      <div className="relative mx-auto max-w-md px-6 pt-14 pb-16">
        <Link to="/" className="flex items-center gap-3 mb-12">
          <div className="h-10 w-10 rounded-xl bg-gold grid place-items-center text-gold-foreground gold-glow">
            <Sparkles className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="eyebrow leading-none">Band9 Coach</p>
            <p className="text-[11px] text-foreground/60 mt-1">IELTS, mastered.</p>
          </div>
        </Link>

        <p className="eyebrow">Sign in</p>
        <h1 className="font-display text-4xl mt-1 leading-tight">Welcome back.</h1>
        <p className="text-foreground/60 mt-2 text-sm">Continue where your last session left off.</p>

        <button
          onClick={google}
          className="mt-10 h-12 w-full rounded-2xl bg-cream text-cream-foreground font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-[var(--shadow-card)]"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-foreground/40">
          <div className="h-px flex-1 bg-border" />
          or
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-card/40 px-4 text-sm placeholder:text-foreground/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 transition"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-2xl border border-input bg-card/40 px-4 text-sm placeholder:text-foreground/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 transition"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-gold text-gold-foreground font-bold tracking-wide disabled:opacity-50 hover:opacity-95 transition gold-glow"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-sm text-center text-foreground/60">
          New here?{" "}
          <Link to="/signup" className="text-gold font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}


function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC04" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
  );
}
