// Shared IELTS constants and helpers
export const SKILLS = ["Listening", "Reading", "Writing", "Speaking", "Not Sure"] as const;
export const ACCENTS = ["British", "Australian", "Canadian", "American", "Mixed"] as const;
export const PLAN_LENGTHS = [7, 15, 30] as const;
export const DIFFICULTY = [
  { value: "4-5", label: "Band 4 – 5" },
  { value: "5.5-6.5", label: "Band 5.5 – 6.5" },
  { value: "7-8", label: "Band 7 – 8" },
  { value: "8-9", label: "Band 8 – 9" },
] as const;

export const AI_DISCLAIMER =
  "Scores are AI-estimated practice bands based on IELTS-style public assessment criteria. Official IELTS scores can only be awarded by official IELTS examiners.";

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function bandColor(band: number | null | undefined) {
  if (band == null) return "text-muted-foreground";
  if (band >= 7) return "text-success";
  if (band >= 5.5) return "text-warning";
  return "text-destructive";
}

export function daysUntil(date?: string | null) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return Math.max(0, diff);
}
