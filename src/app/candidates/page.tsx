import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, ScoreBadge, StageBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    include: { applications: { include: { job: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="mt-1 text-sm text-slate-500">
          Everyone in the database, across every role.
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card className="p-12 text-center text-sm text-slate-500">
          No candidates yet. Upload a resume from a role page.
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {candidates.map((c) => (
            <div key={c.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-slate-500">{c.email}</p>
              </div>
              <div className="mt-3 space-y-1.5">
                {c.applications.map((a) => (
                  <Link
                    key={a.id}
                    href={`/applications/${a.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <span className="flex-1 truncate text-slate-700">{a.job.title}</span>
                    <ScoreBadge score={a.ruleScore} label="base" />
                    <ScoreBadge score={a.aiScore} label="AI" />
                    <StageBadge stage={a.stage} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
