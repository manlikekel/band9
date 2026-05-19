import { Link, useLocation } from "@tanstack/react-router";
import { Home, BookOpen, Target, BarChart3, Settings } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/practice", label: "Practice", icon: BookOpen },
  { to: "/mock", label: "Mock", icon: Target },
  { to: "/progress", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Menu", icon: Settings },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <div className="pointer-events-auto rounded-[28px] border border-border bg-[color-mix(in_oklch,var(--card)_92%,transparent)] backdrop-blur-xl shadow-[var(--shadow-elevated)] grid grid-cols-5 px-2 py-2">
          {items.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-1 py-1.5 transition"
              >
                <Icon
                  className={`h-5 w-5 transition ${active ? "text-gold" : "text-foreground/40"}`}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span
                  className={`text-[9px] font-bold uppercase tracking-[0.18em] ${active ? "text-gold" : "text-foreground/40"}`}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
