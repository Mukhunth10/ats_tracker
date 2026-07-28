/**
 * Lightweight, offline extraction of three recruiter-facing facets from a CV:
 * work authorisation, highest degree, and a location hint. Pure regex/keyword
 * work — no model, no cost — so it runs on every row without slowing the list.
 *
 * IMPORTANT: these are *hints read off the CV text*, not verified facts. Work
 * authorisation especially MUST be confirmed with a proper right-to-work check;
 * a keyword is not a legal status. Treat every facet as "worth a look", never as
 * an automated gate — same rule the rest of the tool follows.
 */

export type WorkAuth = "right" | "sponsor" | "unknown";
export type DegreeLevel = "phd" | "master" | "bachelor" | "diploma" | "none";

export const DEGREE_RANK: Record<DegreeLevel, number> = {
  none: 0,
  diploma: 1,
  bachelor: 2,
  master: 3,
  phd: 4,
};

export const DEGREE_LABEL: Record<DegreeLevel, string> = {
  phd: "PhD",
  master: "Master’s",
  bachelor: "Bachelor’s",
  diploma: "Diploma",
  none: "No degree found",
};

export const WORK_AUTH_LABEL: Record<WorkAuth, string> = {
  right: "Right to work",
  sponsor: "Needs sponsorship",
  unknown: "Not stated",
};

export interface CvFacets {
  workAuth: WorkAuth;
  degree: DegreeLevel;
}

// Phrases that indicate the candidate needs visa sponsorship (checked first, as
// it's the more consequential and usually explicit signal).
const NEEDS_SPONSOR =
  /\b(require|requires|requiring|need|needs|needing|seeking|would need)\s+(?:a\s+)?(?:visa\s+)?sponsorship\b|\bsponsorship\s+(?:is\s+)?(?:required|needed)\b|\bvisa\s+sponsorship\s+(?:required|needed)\b/i;

// Phrases that indicate an existing right to work / no sponsorship needed.
const HAS_RIGHT =
  /\b(right to work|authori[sz]ed to work|eligible to work|permitted to work|legally able to work|no sponsorship (?:required|needed)|do not require sponsorship|don't require sponsorship|settled status|pre-settled status|indefinite leave to remain|\bilr\b|permanent resident|permanent residency|stamp\s?4|work permit|green card|citizen(?:ship)?)\b/i;

export function detectWorkAuth(text: string): WorkAuth {
  if (NEEDS_SPONSOR.test(text)) return "sponsor";
  if (HAS_RIGHT.test(text)) return "right";
  return "unknown";
}

const DEGREE_PATTERNS: [DegreeLevel, RegExp][] = [
  ["phd", /\b(ph\.?\s?d\.?|doctorate|doctoral|dphil)\b/i],
  [
    "master",
    /\b(m\.?\s?sc|m\.?\s?eng|m\.?\s?tech|m\.?\s?b\.?\s?a|m\.?\s?phil|master['’]?s?|postgraduate|pg\s?dip(?:loma)?)\b/i,
  ],
  [
    "bachelor",
    /\b(b\.?\s?sc|b\.?\s?eng|b\.?\s?tech|b\.?\s?e\.?\b|b\.?\s?a\.?\b|b\.?\s?arch|bachelor['’]?s?|(?:hons|honours)\s+degree|degree\s+in)\b/i,
  ],
  ["diploma", /\b(diploma|hnd|higher national|foundation degree)\b/i],
];

/** Highest degree level mentioned anywhere in the CV. */
export function detectDegree(text: string): DegreeLevel {
  for (const [level, re] of DEGREE_PATTERNS) {
    if (re.test(text)) return level; // patterns are ordered highest → lowest
  }
  return "none";
}

export function extractFacets(resumeText: string): CvFacets {
  return {
    workAuth: detectWorkAuth(resumeText),
    degree: detectDegree(resumeText),
  };
}
