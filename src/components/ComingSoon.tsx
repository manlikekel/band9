import { PageHeader } from "@/components/PageHeader";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { Construction } from "lucide-react";

export function ComingSoon({ title, back = "/practice", note }: { title: string; back?: string; note?: string }) {
  return (
    <div>
      <PageHeader title={title} back={back} />
      <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <Construction className="h-8 w-8 mx-auto text-gold" />
        <p className="mt-3 font-display text-lg font-semibold">Coming next</p>
        <p className="text-sm text-muted-foreground mt-2">
          {note ?? "This module is wired into the AI marking engine and will be available in the next release. Writing Task 1, Writing Task 2, and the Dashboard are fully functional today."}
        </p>
      </div>
      <AiDisclaimer className="mt-6" />
    </div>
  );
}
