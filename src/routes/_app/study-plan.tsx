import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/_app/study-plan")({ component: () => <ComingSoon title="Study Plan" back="/dashboard" /> });
