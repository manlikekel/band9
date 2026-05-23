import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    // Already installed?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS fallback: Safari never fires beforeinstallprompt
    const ua = window.navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
    if (isIOS && isSafari) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!evt && !iosHint) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setEvt(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  };

  return (
    <div className="fixed bottom-24 inset-x-0 z-50 px-4 pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto rounded-2xl border border-gold/40 bg-card/95 backdrop-blur-xl p-3 pl-4 shadow-[var(--shadow-elevated)] flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gold text-gold-foreground grid place-items-center shrink-0">
          <Download className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="eyebrow leading-none">Install</p>
          <p className="text-xs text-foreground/80 mt-1 truncate">
            {iosHint ? "Tap Share → Add to Home Screen" : "Install Band9 Coach for offline-style access"}
          </p>
        </div>
        {evt && (
          <button
            onClick={install}
            className="h-9 px-3 rounded-xl bg-gold text-gold-foreground text-xs font-bold uppercase tracking-wider"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="h-9 w-9 rounded-xl border border-border text-foreground/60 grid place-items-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
