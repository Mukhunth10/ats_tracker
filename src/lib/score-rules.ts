import {
  detectTermHits,
  detectYears,
  SKILLS,
  SKILL_BY_KEY,
  parseKeyword,
  type CustomKeyword,
  type Evidence,
} from "./bim-taxonomy";

/** A skill only listed in a keyword dump is worth half a skill actually used. */
const LISTED_CREDIT = 0.5;

/** Weight given to a recruiter-typed keyword when they don't set one. */
export const DEFAULT_KEYWORD_WEIGHT = 3;

export interface RuleDetail {
  matched: string[];
  /** Skills backed by an accomplishment line, not just a keyword list. */
  demonstrated: string[];
  /** Skills that appear only as bare keywords. */
  listedOnly: string[];
  /** Resume line that earned credit, per skill — shown to the reviewer. */
  evidence: Record<string, string>;
  missingMustHave: string[];
  matchedNiceToHave: string[];
  yearsDetected: number;
  yearsRequired: number;
}

export interface RuleResult {
  score: number;
  detail: RuleDetail;
}

export interface JobCriteria {
  /** Keys from the built-in library. */
  mustHave: string[];
  niceToHave: string[];
  /** Raw keyword strings the recruiter typed, e.g. "Primavera P6 | P6". */
  customMustHave?: string[];
  customNiceToHave?: string[];
  minYears: number;
}

/**
 * Deterministic scoring — no API, no cost, no network.
 *
 * Composition: must-haves 60, nice-to-haves 20, experience 20.
 *
 * Must-haves are weighted two ways at once. First by weight, so missing a
 * critical skill costs more than missing a peripheral one. Second by evidence
 * strength: a skill demonstrated in an accomplishment earns full weight, a
 * skill merely listed earns half. That second factor is what separates someone
 * who did the work from someone who typed the right words.
 *
 * Built-in library skills and recruiter-typed keywords are scored identically —
 * the engine does not care where a term came from.
 */
export function scoreByRules(resumeText: string, job: JobCriteria): RuleResult {
  // Build the vocabulary for this role: library entries plus typed keywords.
  const customMust = (job.customMustHave ?? [])
    .map((raw) => parseKeyword(raw, "must"))
    .filter((k): k is CustomKeyword => k !== null);
  const customNice = (job.customNiceToHave ?? [])
    .map((raw) => parseKeyword(raw, "nice"))
    .filter((k): k is CustomKeyword => k !== null);

  const vocabulary = [...SKILLS, ...customMust, ...customNice];

  const hits = detectTermHits(resumeText, vocabulary);
  const byKey = new Map<string, Evidence>(hits.map((h) => [h.key, h.evidence]));
  const yearsDetected = detectYears(resumeText);

  const weightOf = (key: string): number =>
    SKILL_BY_KEY.get(key)?.weight ??
    [...customMust, ...customNice].find((k) => k.key === key)?.weight ??
    DEFAULT_KEYWORD_WEIGHT;

  const credit = (key: string): number => {
    const evidence = byKey.get(key);
    if (!evidence) return 0;
    return evidence === "demonstrated" ? 1 : LISTED_CREDIT;
  };

  const mustKeys = [...job.mustHave, ...customMust.map((k) => k.key)];
  const niceKeys = [...job.niceToHave, ...customNice.map((k) => k.key)];

  // --- Must-haves (60 pts): weight × evidence credit ---
  const mustWeightTotal = mustKeys.reduce((sum, key) => sum + weightOf(key), 0);
  const mustWeightHit = mustKeys.reduce(
    (sum, key) => sum + weightOf(key) * credit(key),
    0,
  );
  const mustPoints = mustWeightTotal === 0 ? 60 : (mustWeightHit / mustWeightTotal) * 60;

  // --- Nice-to-haves (20 pts): flat, but still evidence-weighted ---
  const niceCredit = niceKeys.reduce((sum, key) => sum + credit(key), 0);
  const nicePoints = niceKeys.length === 0 ? 20 : (niceCredit / niceKeys.length) * 20;

  // --- Experience (20 pts) ---
  // Full marks at the requirement; partial credit below it rather than a cliff,
  // because a strong 3-year candidate on a 5-year role is still worth reading.
  let yearsPoints: number;
  if (job.minYears === 0) yearsPoints = 20;
  else if (yearsDetected >= job.minYears) yearsPoints = 20;
  else yearsPoints = (yearsDetected / job.minYears) * 20;

  // Only report skills relevant to this role, plus any library skill found —
  // custom keywords from *other* roles are not part of this vocabulary anyway.
  return {
    score: Math.round(mustPoints + nicePoints + yearsPoints),
    detail: {
      matched: hits.map((h) => h.key),
      demonstrated: hits.filter((h) => h.evidence === "demonstrated").map((h) => h.key),
      listedOnly: hits.filter((h) => h.evidence === "listed").map((h) => h.key),
      evidence: Object.fromEntries(hits.map((h) => [h.key, h.snippet])),
      // A skill that is only listed still counts as present, not missing — the
      // score already discounts it. Flagging it as missing would double-punish.
      missingMustHave: mustKeys.filter((key) => !byKey.has(key)),
      matchedNiceToHave: niceKeys.filter((key) => byKey.has(key)),
      yearsDetected,
      yearsRequired: job.minYears,
    },
  };
}
