import { AI_DISCLAIMER } from "@/lib/ielts";
import { Info } from "lucide-react";

export function AiDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`flex gap-2 items-start text-[11px] leading-relaxed text-muted-foreground ${className}`}>
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{AI_DISCLAIMER}</span>
    </p>
  );
}
