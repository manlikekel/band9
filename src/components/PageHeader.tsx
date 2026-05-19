import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 px-4 pt-4 pb-3 bg-[color-mix(in_oklch,var(--background)_85%,transparent)] backdrop-blur-xl border-b border-border">
      <div className="flex items-center gap-3">
        {back ? (
          <Link
            to={back}
            className="h-9 w-9 grid place-items-center rounded-full border border-border bg-card/40 hover:border-gold/40 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <div className="flex-1 min-w-0">
          {subtitle ? (
            <p className="eyebrow truncate">{subtitle}</p>
          ) : null}
          <h1 className="font-display text-2xl leading-tight truncate">{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}
