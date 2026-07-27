import { SKILL_BY_KEY, labelForKey } from "./bim-taxonomy";
import type { AiResult } from "./score-ai";

/**
 * Free, local LLM screening via Ollama.
 *
 * Runs an open-source model (Llama 3.1, Mistral, etc.) on the user's own machine
 * through Ollama's HTTP API. Candidate data never leaves the machine — the
 * private, GDPR-friendly alternative to the cloud Claude screener, at zero cost.
 *
 * Produces the same AiResult shape as the Claude screener, so the rest of the app
 * displays it identically. The prompt is role-driven (it screens against whatever
 * the role actually asks for) rather than assuming a software-developer role, so
 * it works for a BIM Coordinator or a Planning Engineer just as well.
 */

const DEFAULT_URL = "http://localhost:11434";

export function localAiConfigured(): boolean {
  // Enabled whenever a model is named; the URL defaults to a local Ollama.
  return Boolean(process.env.LOCAL_AI_MODEL);
}

function baseUrl(): string {
  return (process.env.LOCAL_AI_URL || DEFAULT_URL).replace(/\/$/, "");
}

/** Quick liveness check so the UI can show whether local screening will work. */
export async function localAiAvailable(): Promise<boolean> {
  if (!localAiConfigured()) return false;
  try {
    const res = await fetch(`${baseUrl()}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const SYSTEM = `You are an expert technical recruiter screening a candidate CV against a
specific role. Judge fit on genuine, demonstrated evidence — a skill named in a
project the candidate actually did counts far more than the same word sitting in
a keyword list. Reward relevant, hands-on experience for THIS role; do not assume
the role is a software job unless the role says so.

Be calibrated and honest: 80+ means genuinely strong, ~50 borderline, below 35
clearly not a fit. Do not cluster everyone in the 60s. If the CV is too thin to
judge, say so and score low with a "maybe" recommendation rather than inventing
experience. Cite concrete evidence from the CV; never infer a skill that is not
there.`;

/**
 * The prompt asks for strict JSON. Ollama's format:"json" constrains the model
 * to valid JSON, but small models still wander, so parsing is defensive.
 */
function buildPrompt(
  resumeText: string,
  job: {
    title: string;
    seniority: string;
    minYears: number;
    description: string;
    mustHave: string[];
    niceToHave: string[];
  },
): string {
  const label = (k: string) => (k.startsWith("custom:") ? labelForKey(k) : SKILL_BY_KEY.get(k)?.label ?? k);
  return `Role:
Title: ${job.title}
Seniority: ${job.seniority}
Minimum years: ${job.minYears}
Must-have skills: ${job.mustHave.map(label).join(", ") || "none specified"}
Nice-to-have skills: ${job.niceToHave.map(label).join(", ") || "none specified"}
Description: ${job.description || "(none)"}

CV:
${resumeText}

Return ONLY a raw JSON object (no markdown, no commentary) with exactly these keys:
{
  "score": <integer 0-100, overall fit>,
  "summary": "<2-3 sentence verdict a hiring manager can read alone>",
  "seniorityAssessment": "<observed seniority vs what the role asks>",
  "strengths": ["<specific strength>", ...],
  "gaps": ["<specific gap or missing requirement>", ...],
  "bimEvidence": [{"skill": "<role skill>", "evidence": "<quote or paraphrase from the CV>"}],
  "recommendation": "<advance | maybe | reject>"
}`;
}

/** Pulls the first balanced JSON object out of a model response. */
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Some models prepend chatter; grab from the first { to the last }.
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("Model did not return valid JSON");
  }
}

/** Coerces a loose model object into a well-formed AiResult. */
function normalise(obj: Record<string, unknown>): AiResult {
  const asArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : [];
  const rec = ["advance", "maybe", "reject"];
  const recommendation = rec.includes(String(obj.recommendation))
    ? (obj.recommendation as AiResult["recommendation"])
    : "maybe";

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(obj.score) || 0))),
    summary: String(obj.summary ?? "").slice(0, 2000) || "No summary produced.",
    seniorityAssessment: String(obj.seniorityAssessment ?? ""),
    strengths: asArr(obj.strengths),
    gaps: asArr(obj.gaps),
    bimEvidence: Array.isArray(obj.bimEvidence)
      ? (obj.bimEvidence as unknown[])
          .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
          .map((e) => ({ skill: String(e.skill ?? ""), evidence: String(e.evidence ?? "") }))
      : [],
    recommendation,
  };
}

export async function scoreByLocalAi(
  resumeText: string,
  job: {
    title: string;
    track: string;
    seniority: string;
    minYears: number;
    description: string;
    mustHave: string[];
    niceToHave: string[];
  },
): Promise<AiResult> {
  const model = process.env.LOCAL_AI_MODEL;
  if (!model) throw new Error("LOCAL_AI_MODEL is not set");

  const res = await fetch(`${baseUrl()}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: SYSTEM,
      prompt: buildPrompt(resumeText, job),
      format: "json", // constrain output to valid JSON
      stream: false,
      options: { temperature: 0 }, // deterministic screening
    }),
    // Local models on CPU can be slow; give them room.
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(
      `Local model error (${res.status}). Is Ollama running and the model pulled?`,
    );
  }

  const data = (await res.json()) as { response?: string };
  if (!data.response) throw new Error("Empty response from local model");

  return normalise(extractJson(data.response) as Record<string, unknown>);
}
