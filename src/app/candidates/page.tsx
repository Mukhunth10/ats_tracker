import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, ScoreRing, StageBadge } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  // Page-level guard: never rely on the route guard alone.
  await requirePageUser();

  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    include: { applications: { include: { job: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Everyone in the database, across every role.
        </p>
      </div>

      {candidates.length === 0 ? (
        <Card className="p-12 text-center text-sm text-ink-muted">
          No candidates yet. Upload a resume from a role page.
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--border)]">
          {candidates.map((c) => (
            <div key={c.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-ink-muted">{c.email}</p>
              </div>
              <div className="mt-3 space-y-1.5">
                {c.applications.map((a) => (
                  <Link
                    key={a.id}
                    href={`/applications/${a.id}`}
                    className="flex flex-wrap items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <span className="flex-1 truncate text-ink">{a.job.title}</span>
                    <ScoreRing score={a.ruleScore} label="base" size={40} />
                    <ScoreRing score={a.aiScore} label="AI" size={40} />
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
