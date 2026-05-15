import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/ComingSoon";
export const Route = createFileRoute("/_app/progress")({ component: () => <ComingSoon title="Progress" back="/dashboard" note="Trends per skill, mock history, and weakness analysis will appear here as you complete more practice and mocks." /> });
