import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/_app/mock")({ component: () => <ComingSoon title="Full Mock Exam" back="/dashboard" note="Strict and practice modes with sticky timers, auto-submit, and a complete AI report are coming next. Use individual practice in the meantime." /> });
