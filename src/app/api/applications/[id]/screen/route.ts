import { NextResponse } from "next/server";
import { prisma, parseJson } from "@/lib/db";
import { scoreByAi, isAiConfigured } from "@/lib/score-ai";
import { denyAnonymous } from "@/lib/api-auth";

export const runtime = "nodejs";
export const maxDuration = 120; // Opus at high effort can take a while on a long resume

/** Runs Claude screening for one application and persists the verdict. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await denyAnonymous();
  if (denied) return denied;

  const { id } = await ctx.params;

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set — AI screening is unavailable." },
      { status: 503 },
    );
  }

  const application = await prisma.application.findUnique({
    where: { id },
    include: { candidate: true, job: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  try {
    const result = await scoreByAi(application.candidate.resumeText, {
      title: application.job.title,
      track: application.job.track,
      seniority: application.job.seniority,
      minYears: application.job.minYears,
      description: application.job.description,
      mustHave: parseJson<string[]>(application.job.mustHave, []),
      niceToHave: parseJson<string[]>(application.job.niceToHave, []),
    });

    const updated = await prisma.application.update({
      where: { id },
      data: {
        aiScore: result.score,
        aiSummary: result.summary,
        aiDetail: JSON.stringify(result),
        aiScoredAt: new Date(),
      },
      include: { candidate: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("AI screening failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screening failed" },
      { status: 502 },
    );
  }
}
