"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ScoreRing, SkillChip, STAGES, inputBase } from "./ui";
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

type SortKey = "score" | "name" | "proven";

/**
 * The screen recruiters spend their day in.
 *
 * Filtering happens in the browser because the whole list for one role is
 * already on the page — a round trip per keystroke would feel sluggish for no
 * benefit. Past a few thousand applicants on a single role this should move to
 * a server query.
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
  const [sort, setSort] = useState<SortKey>("score");

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
    // Space-separated terms are ANDed, so "revit primavera" finds CVs with both.
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const result = rows.filter((r) => {
      if ((r.aiScore ?? r.ruleScore) < minScore) return false;
      if (stage !== "all" && r.stage !== stage) return false;
      if (source !== "all" && !(r.source ?? "direct").includes(source)) return false;
      if (terms.length > 0) {
        const hay = `${r.name} ${r.email} ${r.haystack}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "proven") return b.proven - a.proven;
      return (b.aiScore ?? b.ruleScore) - (a.aiScore ?? a.ruleScore);
    });
  }, [rows, minScore, stage, source, query, sort]);

  const control =
    "rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink transition-colors duration-150 focus:border-primary focus:outline-none";

  const hasFilters = minScore > 0 || stage !== "all" || source !== "all" || query !== "";

  return (
    <div className="space-y-3">
      {/* --- Filter bar --- */}
      <div className="rounded-xl border border-line bg-surface p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-56 flex-1">
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              fill="none"
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-subtle"
            >
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="m14 14 3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, or any word in the CV…"
              aria-label="Search candidates"
              className={`${inputBase} py-1.5 pl-9`}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-ink-muted">Min score</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-24 accent-[var(--primary)]"
              aria-label="Minimum score"
            />
            <span className="tabular w-7 text-right font-medium">{minScore}</span>
          </label>

          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            aria-label="Filter by stage"
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
              aria-label="Filter by source"
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

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
            className={control}
          >
            <option value="score">Sort: score</option>
            <option value="proven">Sort: proven skills</option>
            <option value="name">Sort: name</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => {
                setMinScore(0);
                setStage("all");
                setSource("all");
                setQuery("");
              }}
              className="rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              Clear
            </button>
          )}

          <span className="tabular ml-auto text-sm text-ink-muted">
            {filtered.length} of {rows.length}
          </span>
        </div>
      </div>

      {/* --- Results --- */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-ink-muted">
            No candidates match these filters.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {filtered.map((r, i) => (
              <li
                key={r.id}
                className="rise"
                style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}
              >
                <div className="group flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-surface-hover">
                  <ScoreRing
                    score={r.aiScore ?? r.ruleScore}
                    label={r.aiScore !== null ? "AI score" : "Score"}
                    size={40}
                  />

                  <Link href={`/applications/${r.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium transition-colors group-hover:text-primary">
                      {r.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                      <span className="truncate">{r.email}</span>
                      {r.years > 0 && (
                        <>
                          <span aria-hidden className="text-ink-subtle">
                            ·
                          </span>
                          <span className="tabular">{r.years} yrs</span>
                        </>
                      )}
                      <span aria-hidden className="text-ink-subtle">
                        ·
                      </span>
                      <span className="tabular text-success">
                        {r.proven} proven
                      </span>
                    </p>

                    {r.missing.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-xs text-ink-subtle">missing</span>
                        {r.missing.slice(0, 3).map((k) => (
                          <SkillChip key={k} skillKey={k} tone="bad" />
                        ))}
                        {r.missing.length > 3 && (
                          <span className="text-xs text-ink-subtle">
                            +{r.missing.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>

                  <div className="flex shrink-0 items-center gap-3">
                    {aiEnabled && r.aiScore !== null && (
                      <span className="hidden rounded-md bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary sm:inline">
                        AI
                      </span>
                    )}
                    <span className="hidden rounded-md bg-surface-2 px-2 py-0.5 text-xs text-ink-muted md:inline">
                      {r.source ?? "direct"}
                    </span>
                    <StageSelect applicationId={r.id} stage={r.stage} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
