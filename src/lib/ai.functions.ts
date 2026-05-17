import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Strict JSON-based prompts per the spec.
const PROMPTS = {
  listening_reading: `You are a strict IELTS examiner marking ONE Listening or Reading answer.
Return ONLY a JSON object with these exact keys:
is_correct (boolean), user_answer (string), correct_answer (string), reason (string),
spelling_issue (boolean), word_limit_issue (boolean), singular_plural_issue (boolean),
explanation (string), improvement_tip (string).
Rules: respect word limit instruction; accept listed alternatives; mark plural/singular and spelling strictly.`,

  writing_task1: `You are a calibrated IELTS General Writing Task 1 examiner. Mark the user's letter using the four official band descriptors.
Return ONLY JSON with keys:
estimated_band (number 0-9, .5 steps),
task_achievement_band (number), coherence_cohesion_band (number),
lexical_resource_band (number), grammar_band (number),
bullet_point_coverage (array of { bullet: string, covered: boolean, comment: string }),
grammar_errors (array of { quote: string, fix: string, explanation: string }),
vocabulary_errors (array of { quote: string, suggestion: string, explanation: string }),
coherence_issues (array of strings),
corrected_answer (string, the user's letter rewritten and corrected),
band_8_9_sample (string, a model Band 8/9 letter for the same prompt),
three_improvement_tips (array of exactly 3 short strings).`,

  writing_task2: `You are a calibrated IELTS Writing Task 2 examiner. Mark the user's essay using the four official band descriptors. Weight task response and coherence heavily.
Return ONLY JSON with keys:
estimated_band (number 0-9, .5 steps),
task_response_band (number), coherence_cohesion_band (number),
lexical_resource_band (number), grammar_band (number),
thesis_clarity (string), paragraph_structure (string),
grammar_errors (array of { quote: string, fix: string, explanation: string }),
vocabulary_errors (array of { quote: string, suggestion: string, explanation: string }),
repeated_words (array of { word: string, count: number, suggestion: string }),
corrected_essay (string),
band_8_9_sample_essay (string),
three_improvement_tips (array of exactly 3 short strings).`,

  speaking: `You are a calibrated IELTS Speaking examiner. Mark the user's spoken answer based on the transcript and metadata.
Return ONLY JSON with keys:
estimated_band (number 0-9, .5 steps),
fluency_coherence_band (number), lexical_resource_band (number),
grammar_band (number), pronunciation_band (number),
fluency_feedback (string), vocabulary_feedback (string),
grammar_feedback (string), pronunciation_feedback (string),
corrected_answer (string), stronger_sample_answer (string),
three_speaking_drills (array of exactly 3 short strings).`,

  generate_questions: `You are an IELTS General question writer. Generate ORIGINAL practice material (no copyrighted past papers).
Return ONLY JSON. Always include passage/script when relevant, an array "questions" with { id, type, prompt, options?, correct_answer, alternatives?, evidence?, explanation }, plus "instructions" (string) and "transcript" (string for listening).`,

  writing_prompt: `Generate ONE original IELTS General Writing prompt as JSON: { task_type, prompt, bullet_points (array of 3 strings, only for task1), essay_type? (only for task2), suggested_tone? }`,

  speaking_prompt: `Generate ONE original IELTS Speaking prompt as JSON depending on the part. Part 1: { part:1, questions: string[] }. Part 2: { part:2, cue_card: { topic: string, points: string[] } }. Part 3: { part:3, questions: string[] }.`,

  mock_report: `You are an IELTS coach. Given section bands, produce JSON with: overall_band (number), strongest_skill, weakest_skill, top_5_mistakes (string[]), seven_day_plan (array of { day, focus, tasks: string[] }), next_practice (string[]).`,
} as const;

const Input = z.object({
  task: z.enum([
    "listening_reading",
    "writing_task1",
    "writing_task2",
    "speaking",
    "generate_questions",
    "writing_prompt",
    "speaking_prompt",
    "mock_report",
  ]),
  payload: z.unknown(),
  model: z.string().optional(),
});

export const aiMark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const system = PROMPTS[data.task];
    const userMsg = JSON.stringify(data.payload);

    // Retry with exponential backoff on 429/5xx.
    let res: Response | null = null;
    let lastErr = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: data.model ?? "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system + "\nReturn ONLY valid JSON, no prose, no markdown fences." },
            { role: "user", content: userMsg },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) break;
      if (res.status === 402) return { error: "AI credits exhausted. Add credits in Settings → Workspace → Usage.", result: null };
      if (res.status !== 429 && res.status < 500) {
        lastErr = await res.text();
        break;
      }
      const wait = 800 * Math.pow(2, attempt) + Math.random() * 400;
      await new Promise((r) => setTimeout(r, wait));
    }

    if (!res || !res.ok) {
      if (res?.status === 429) return { error: "AI is busy. Please wait a few seconds and try again.", result: null };
      console.error("AI gateway error", res?.status, lastErr);
      return { error: "AI service unavailable.", result: null };
    }

    const j = await res.json();
    const text: string = j.choices?.[0]?.message?.content ?? "{}";
    const parsed = robustJsonParse(text);
    if (parsed !== undefined) return { error: null, result: parsed };

    // Repair pass: ask the model to fix its own broken JSON.
    try {
      const repair = await fetch(GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Return ONLY valid minified JSON. No prose, no markdown. Fix the input so it parses as JSON, preserving all data." },
            { role: "user", content: text.slice(0, 12000) },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (repair.ok) {
        const rj = await repair.json();
        const rt: string = rj.choices?.[0]?.message?.content ?? "";
        const rp = robustJsonParse(rt);
        if (rp !== undefined) return { error: null, result: rp };
      }
    } catch (e) {
      console.error("AI repair failed", e);
    }

    console.error("AI returned unparseable content", text.slice(0, 500));
    return { error: "Could not parse AI response. Please retry.", result: { raw: text } };
  });

function robustJsonParse(raw: string): unknown {
  if (!raw) return undefined;
  let s = raw.trim();
  // strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // find first { or [ and last matching close
  const start = s.search(/[\{\[]/);
  if (start === -1) return undefined;
  const openCh = s[start];
  const closeCh = openCh === "{" ? "}" : "]";
  const end = s.lastIndexOf(closeCh);
  if (end > start) s = s.slice(start, end + 1);

  const attempts = [
    s,
    s.replace(/,\s*([}\]])/g, "$1"), // trailing commas
    s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""), // control chars
    s.replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ""),
  ];
  for (const a of attempts) {
    try {
      return JSON.parse(a);
    } catch {
      /* try next */
    }
  }
  // last resort: try to balance braces/brackets if truncated
  try {
    const opens = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
    const obrk = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length;
    if (opens > 0 || obrk > 0) {
      const fixed = s + "]".repeat(Math.max(0, obrk)) + "}".repeat(Math.max(0, opens));
      return JSON.parse(fixed.replace(/,\s*([}\]])/g, "$1"));
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
