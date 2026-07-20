import Link from "next/link";
import { prisma, parseJson } from "@/lib/db";
import { Card, ScoreBadge, SectionTitle, SkillChip } from "@/components/ui";
import { NewRoleForm } from "@/components/new-role-form";

// Recruiters expect the pipeline to reflect the database right now. Without
// this, Next.js 16 prerenders the page at build time and serves stale counts.
export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        select: { id: true, stage: true, ruleScore: true, aiScore: true },
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Open roles</h1>
          <p className="mt-1 text-sm text-slate-500">
            BIM software development pipelines, ranked by fit.
          </p>
        </div>
        <NewRoleForm />
      </div>

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-slate-500">
            No roles yet. Create one to start tracking candidates.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => {
            const mustHave = parseJson<string[]>(job.mustHave, []);
            const active = job.applications.filter(
              (a) => a.stage !== "rejected" && a.stage !== "hired",
            );
            // Surface the best available signal — AI where it has run, rules otherwise.
            const best = job.applications.length
              ? Math.max(...job.applications.map((a) => a.aiScore ?? a.ruleScore))
              : null;
            const screened = job.applications.filter((a) => a.aiScore !== null).length;

            return (
              <Link key={job.id} href={`/jobs/${job.id}`} className="group">
                <Card className="h-full p-5 transition-shadow group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold group-hover:text-slate-950">
                        {job.title}
                      </h3>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {job.track} · {job.location}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                      {job.seniority}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {mustHave.slice(0, 4).map((k) => (
                      <SkillChip key={k} skillKey={k} />
                    ))}
                    {mustHave.length > 4 && (
                      <span className="px-1 py-0.5 text-xs text-slate-400">
                        +{mustHave.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="mt-5 flex items-center gap-5 border-t border-slate-100 pt-4 text-sm">
                    <div>
                      <span className="font-semibold">{job.applications.length}</span>
                      <span className="ml-1 text-slate-500">applicants</span>
                    </div>
                    <div>
                      <span className="font-semibold">{active.length}</span>
                      <span className="ml-1 text-slate-500">active</span>
                    </div>
                    <div>
                      <span className="font-semibold">{screened}</span>
                      <span className="ml-1 text-slate-500">AI screened</span>
                    </div>
                    {best !== null && (
                      <div className="ml-auto">
                        <ScoreBadge score={best} label="top" />
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div>
        <SectionTitle>How scoring works</SectionTitle>
        <Card className="p-5 text-sm leading-relaxed text-slate-600">
          <p>
            Scoring runs <strong className="text-slate-900">offline and free</strong>, with
            no limit on how many CVs you process. Must-have skills are weighted by how
            strongly they predict BIM development ability, then combined with
            nice-to-haves and years of experience.
          </p>
          <p className="mt-3">
            Crucially, a skill only counts fully when the CV{" "}
            <strong className="text-slate-900">proves</strong> it. “Built a Revit API
            add-in used by 400 modellers” earns full credit; “Revit API” sitting in a
            keyword list earns half. That is what stops a CV written for the filter from
            out-ranking a real developer.
          </p>
        </Card>
      </div>
    </div>
  );
}
