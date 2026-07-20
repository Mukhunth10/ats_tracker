import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { denyAnonymous } from "@/lib/api-auth";

const STAGES = ["applied", "screening", "interview", "offer", "hired", "rejected"] as const;

const PatchInput = z.object({ stage: z.enum(STAGES) });

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await denyAnonymous();
  if (denied) return denied;

  const { id } = await ctx.params;
  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: true,
      job: true,
      notes: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json(application);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await denyAnonymous();
  if (denied) return denied;

  const { id } = await ctx.params;
  const parsed = PatchInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "stage must be one of: " + STAGES.join(", ") }, { status: 400 });
  }

  const application = await prisma.application.update({
    where: { id },
    data: { stage: parsed.data.stage },
    include: { candidate: true },
  });
  return NextResponse.json(application);
}
