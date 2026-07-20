import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, parseJson } from "@/lib/db";
import type { RuleDetail } from "@/lib/score-rules";
import type { AiResult } from "@/lib/score-ai";
import { isAiConfigured } from "@/lib/score-ai";
import { Card, ScoreRing, SectionTitle, SkillChip } from "@/components/ui";
import { StageSelect } from "@/components/stage-select";
import { ScreenButton } from "@/components/screen-button";
import { NoteForm } from "@/components/note-form";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RECOMMENDATION_STYLE: Record<string, string> = {
  advance: "bg-emerald-50 text-success ring-emerald-200",
  maybe: "bg-warn-soft text-amber-800 ring-amber-200",
  reject: "bg-rose-50 text-danger ring-rose-200",
};

export default async function ApplicationPage(props: PageProps<"/applications/[id]">) {
  // Page-level guard: never rely on the route guard alone.
  await requirePageUser();

  const { id } = await props.params;

  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: true,
      job: true,
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!app) notFound();

  const rules = parseJson<Partial<RuleDetail>>(app.ruleDetail, {});
  const ai = app.aiDetail ? parseJson<AiResult | null>(app.aiDetail, null) : null;
  const mustHave = parseJson<string[]>(app.job.mustHave, []);

  // AI screening is the only feature that costs money. When no key is set it is
  // hidden entirely rather than shown as a dead button, so nobody on the HR
  // team clicks something that cannot work.
  const aiEnabled = isAiConfigured();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/jobs/${app.jobId}`} className="text-sm text-ink-muted hover:text-ink">
          ← {app.job.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{app.candidate.name}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              {app.candidate.email}
              {app.candidate.phone ? ` · ${app.candidate.phone}` : ""}
              {app.candidate.resumeFile ? ` · ${app.candidate.resumeFile}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing score={app.ruleScore} label="score" size={56} />
            {(aiEnabled || app.aiScore !== null) && (
              <ScoreRing score={app.aiScore} label="AI" size={56} />
            )}
            <StageSelect applicationId={app.id} stage={app.stage} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* --- Evidence: the primary signal, computed offline --- */}
          <div>
            <SectionTitle>Evidence</SectionTitle>
            <Card className="space-y-5 p-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span>
                  <span className="text-ink-muted">Experience: </span>
                  <span className="font-medium">{rules.yearsDetected ?? 0} yrs</span>
                  <span className="text-ink-subtle"> / {app.job.minYears} required</span>
                </span>
                <span>
                  <span className="text-ink-muted">Demonstrated skills: </span>
                  <span className="font-medium">{rules.demonstrated?.length ?? 0}</span>
                </span>
                <span>
                  <span className="text-ink-muted">Listed only: </span>
                  <span className="font-medium">{rules.listedOnly?.length ?? 0}</span>
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-ink-muted">
                  Must-have coverage
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {mustHave.map((k) => (
                    <SkillChip
                      key={k}
                      skillKey={k}
                      tone={
                        rules.missingMustHave?.includes(k)
                          ? "bad"
                          : rules.demonstrated?.includes(k)
                            ? "good"
                            : "neutral"
                      }
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-ink-subtle">
                  Green = proven in a project. Grey = listed as a keyword only (half
                  credit). Red = absent.
                </p>
              </div>

              {(rules.demonstrated?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-success uppercase">
                    Proven in projects
                  </p>
                  <ul className="space-y-2">
                    {rules.demonstrated!.map((k) => (
                      <li key={k} className="border-l-2 border-success-border pl-3 text-sm">
                        <SkillChip skillKey={k} tone="good" />
                        <p className="mt-1 text-ink-muted">{rules.evidence?.[k]}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(rules.listedOnly?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    Listed but not demonstrated
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rules.listedOnly!.map((k) => (
                      <SkillChip key={k} skillKey={k} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-subtle">
                    These appear as keywords with no supporting project. Worth probing in
                    a screening call.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* --- AI verdict (only when a key is configured) --- */}
          {(aiEnabled || ai) && (
          <div>
            <SectionTitle>AI screening</SectionTitle>
            {ai ? (
              <Card className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm leading-relaxed text-ink">{ai.summary}</p>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
                      RECOMMENDATION_STYLE[ai.recommendation] ?? RECOMMENDATION_STYLE.maybe
                    }`}
                  >
                    {ai.recommendation}
                  </span>
                </div>

                <div className="rounded-md bg-surface-2 p-3 text-sm text-ink-muted">
                  <span className="font-medium text-ink">Seniority read: </span>
                  {ai.seniorityAssessment}
                </div>

                {ai.bimEvidence?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                      BIM development evidence
                    </p>
                    <ul className="space-y-2">
                      {ai.bimEvidence.map((e, i) => (
                        <li key={i} className="border-l-2 border-line pl-3 text-sm">
                          <span className="font-medium">{e.skill}</span>
                          <p className="text-ink-muted">{e.evidence}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-success uppercase">
                      Strengths
                    </p>
                    <ul className="space-y-1.5 text-sm text-ink-muted">
                      {ai.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-success">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-danger uppercase">
                      Gaps
                    </p>
                    <ul className="space-y-1.5 text-sm text-ink-muted">
                      {ai.gaps.map((g, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-danger">−</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {app.aiScoredAt && (
                  <p className="border-t border-line pt-3 text-xs text-ink-subtle">
                    Screened {app.aiScoredAt.toLocaleString()}
                  </p>
                )}
              </Card>
            ) : (
              <Card className="p-5 text-sm text-ink-muted">
                Not screened yet. The evidence breakdown above is free and offline; AI
                screening adds a written verdict at a per-candidate cost.
              </Card>
            )}
          </div>
          )}

          {/* --- Resume text --- */}
          <div>
            <SectionTitle>Resume</SectionTitle>
            <Card className="p-5">
              <pre className="max-h-96 overflow-y-auto text-xs leading-relaxed whitespace-pre-wrap text-ink-muted">
                {app.candidate.resumeText}
              </pre>
            </Card>
          </div>
        </div>

        {/* --- Sidebar --- */}
        <div className="space-y-6">
          {aiEnabled && (
            <div>
              <SectionTitle>Actions</SectionTitle>
              <Card className="p-4">
                <ScreenButton applicationId={app.id} alreadyScored={app.aiScore !== null} />
                <p className="mt-2 text-xs text-ink-subtle">
                  Costs roughly $0.04–0.08 per run.
                </p>
              </Card>
            </div>
          )}

          <div>
            <SectionTitle>Notes</SectionTitle>
            <Card className="space-y-4 p-4">
              <NoteForm applicationId={app.id} />
              {app.notes.length > 0 && (
                <ul className="space-y-3 border-t border-line pt-3">
                  {app.notes.map((n) => (
                    <li key={n.id} className="text-sm">
                      <p className="whitespace-pre-wrap text-ink">{n.body}</p>
                      <p className="mt-1 text-xs text-ink-subtle">
                        {n.author} · {n.createdAt.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
