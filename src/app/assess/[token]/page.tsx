import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { SubmitForm } from "./submit-form";

// PUBLIC PAGE — no requirePageUser. The token in the URL is the only credential
// a candidate has; the proxy allowlists /assess so they can reach it without a
// login. Everything shown here is scoped to that single token.
export const dynamic = "force-dynamic";

export default async function AssessPage(props: PageProps<"/assess/[token]">) {
  const { token } = await props.params;

  const assessment = await prisma.assessment.findUnique({
    where: { token },
    include: { application: { include: { job: true, candidate: true } } },
  });

  // A wrong or expired token reveals nothing about whether it ever existed.
  if (!assessment) notFound();

  const done = assessment.status !== "sent";

  return (
    <div className="mx-auto max-w-xl py-4">
      <div className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-fg"
        >
          H
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Hirebase</span>
      </div>

      <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
        <p className="text-xs font-semibold tracking-wider text-ink-subtle uppercase">
          Technical assessment · {assessment.application.job.title}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{assessment.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Hello {assessment.application.candidate.name.split(" ")[0]}, please complete
          the task below.
        </p>

        {assessment.instructions && (
          <div className="mt-5 rounded-lg bg-surface-2 p-4">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-subtle uppercase">
              Instructions
            </p>
            <p className="text-sm whitespace-pre-wrap text-ink">{assessment.instructions}</p>
          </div>
        )}

        {assessment.testUrl && (
          <a
            href={assessment.testUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
          >
            <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4">
              <path
                d="M10 3v10m0 0 3.5-3.5M10 13 6.5 9.5M4 15.5h12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Download the test file
          </a>
        )}

        <div className="mt-6 rounded-lg border border-warn-border bg-warn-soft p-4 text-sm text-warn">
          <p className="font-medium">Before you start</p>
          <p className="mt-1 leading-relaxed">
            Record your screen while you work — free tools: Windows Game Bar (press
            Win+G), OBS Studio, or Loom. When finished, upload the recording to Google
            Drive, Loom, or WeTransfer and paste the <strong>share link</strong> below.
            We time the task from the recording, so please record the whole session.
          </p>
        </div>

        <div className="mt-6 border-t border-line pt-6">
          {assessment.status === "reviewed" ? (
            <p className="text-sm text-ink-muted">
              This assessment has been reviewed and is now closed. Thank you.
            </p>
          ) : (
            <SubmitForm
              token={token}
              submitted={done}
              defaults={{
                videoUrl: assessment.videoUrl,
                outputUrl: assessment.outputUrl,
                candidateNote: assessment.candidateNote,
              }}
            />
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-subtle">
        This link is personal to you. Please don't share it.
      </p>
    </div>
  );
}
