import { SKILL_BY_KEY } from "@/lib/bim-taxonomy";

export const STAGES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export const STAGE_STYLE: Record<string, string> = {
  applied: "bg-slate-100 text-slate-700 ring-slate-200",
  screening: "bg-sky-50 text-sky-700 ring-sky-200",
  interview: "bg-violet-50 text-violet-700 ring-violet-200",
  offer: "bg-amber-50 text-amber-800 ring-amber-200",
  hired: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** Colour bands match the rubric's calibration: 80+ strong, 50 borderline, <35 no. */
function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 60) return "bg-lime-50 text-lime-700 ring-lime-200";
  if (score >= 40) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

export function ScoreBadge({
  score,
  label,
  size = "sm",
}: {
  score: number | null;
  label: string;
  size?: "sm" | "lg";
}) {
  if (score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-400 ring-1 ring-slate-200 ring-inset">
        {label} —
      </span>
    );
  }

  const big = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md ring-1 ring-inset ${scoreTone(score)} ${
        big ? "px-3 py-1.5 text-base font-semibold" : "px-2 py-1 text-xs font-medium"
      }`}
    >
      <span className={big ? "text-xs font-normal opacity-70" : "opacity-70"}>{label}</span>
      {score}
    </span>
  );
}

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        STAGE_STYLE[stage] ?? STAGE_STYLE.applied
      }`}
    >
      {stage}
    </span>
  );
}

/** Renders a taxonomy skill key as its human label; unknown keys pass through. */
export function SkillChip({ skillKey, tone = "neutral" }: { skillKey: string; tone?: "neutral" | "good" | "bad" }) {
  const label = SKILL_BY_KEY.get(skillKey)?.label ?? skillKey;
  const styles = {
    neutral: "bg-slate-100 text-slate-700",
    good: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset",
    bad: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 ring-inset",
  }[tone];

  return <span className={`inline-flex rounded px-2 py-0.5 text-xs ${styles}`}>{label}</span>;
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
      {children}
    </h2>
  );
}
