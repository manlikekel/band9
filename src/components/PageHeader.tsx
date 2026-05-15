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
    <header className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 bg-background/85 backdrop-blur-lg border-b border-border">
      <div className="flex items-center gap-3">
        {back ? (
          <Link to={back} className="p-1 -ml-1 rounded-lg hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        ) : null}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-semibold truncate">{title}</h1>
          {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </header>
  );
}
