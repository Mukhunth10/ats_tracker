"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { labelForKey } from "@/lib/bim-taxonomy";
import { ScoreBadge, SkillChip, STAGES } from "./ui";
import { StageSelect } from "./stage-select";

export interface FilterRow {
  id: string;
  name: string;
  email: string;
  stage: string;
  ruleScore: number;
  aiScore: number | null;
  years: number;
  proven: number;
  missing: string[];
  /** Portal the application arrived through. Optional so a row written before
   *  source tracking existed renders instead of crashing the list. */
  source?: string | null;
  /** Lowercased resume text, for keyword search. */
  haystack: string;
}

/**
 * Client-side filtering. The whole candidate list for one role is already on
 * the page, so filtering in the browser is instant and avoids a round trip per
 * keystroke. If a single role ever exceeds a few thousand applicants this
 * should move to a server query.
 */
export function CandidateFilter({
  rows,
  aiEnabled,
}: {
  rows: FilterRow[];
  aiEnabled: boolean;
}) {
  const [minScore, setMinScore] = useState(0);
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");

  // One entry per portal actually present, so the dropdown reflects reality
  // rather than a hardcoded list.
  const sources = useMemo(
    () =>
      [
        ...new Set(
          rows.flatMap((r) => (r.source ?? "direct").split(",").map((s) => s.trim())),
        ),
      ].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Space-separated terms are ANDed, so "revit primavera" finds CVs with both.
    const terms = q.split(/\s+/).filter(Boolean);

    return rows.filter((r) => {
      if ((r.aiScore ?? r.ruleScore) < minScore) return false;
      if (stage !== "all" && r.stage !== stage) return false;
      if (source !== "all" && !(r.source ?? "direct").includes(source)) return false;
      if (terms.length > 0) {
        const hay = `${r.name} ${r.email} ${r.haystack}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
  }, [rows, minScore, stage, source, query]);

  const control =
    "rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, or any word in the CV…"
          className={`${control} min-w-56 flex-1`}
        />

        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Min score</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-28 accent-slate-900"
          />
          <span className="w-8 text-right font-medium tabular-nums">{minScore}</span>
        </label>

        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className={`${control} capitalize`}
        >
          <option value="all">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>

        {sources.length > 1 && (
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={control}
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        {(minScore > 0 || stage !== "all" || source !== "all" || query) && (
          <button
            onClick={() => {
              setMinScore(0);
              setStage("all");
              setSource("all");
              setQuery("");
            }}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">
            No candidates match these filters.
          </p>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="flex items-center gap-4 p-4">
              <Link href={`/applications/${r.id}`} className="group min-w-0 flex-1">
                <p className="truncate font-medium group-hover:underline">{r.name}</p>
                <p className="truncate text-sm text-slate-500">
                  {r.email}
                  {r.years ? ` · ${r.years} yrs` : ""}
                  {` · ${r.proven} skill${r.proven === 1 ? "" : "s"} proven`}
                  <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                    {r.source ?? "direct"}
                  </span>
                </p>
                {r.missing.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="text-xs text-slate-400">missing</span>
                    {r.missing.slice(0, 3).map((k) => (
                      <SkillChip key={k} skillKey={k} tone="bad" />
                    ))}
                    {r.missing.length > 3 && (
                      <span className="text-xs text-slate-400">
                        +{r.missing.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </Link>

              <div className="flex shrink-0 items-center gap-2">
                <ScoreBadge score={r.ruleScore} label="score" />
                {(aiEnabled || r.aiScore !== null) && (
                  <ScoreBadge score={r.aiScore} label="AI" />
                )}
                <StageSelect applicationId={r.id} stage={r.stage} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Re-exported so the server page can label missing-skill chips consistently. */
export { labelForKey };
