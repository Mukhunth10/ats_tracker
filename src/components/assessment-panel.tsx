"use client";

import { useActionState, useState } from "react";
import {
  sendAssessment,
  reviewAssessment,
  type ActionState,
} from "@/app/assessments/actions";
import { btnPrimary, btnSecondary, inputBase, ScoreRing } from "./ui";

export interface AssessmentView {
  status: "sent" | "submitted" | "reviewed";
  title: string;
  token: string;
  sentAt: string;
  submittedAt: string | null;
  videoUrl: string;
  outputUrl: string;
  candidateNote: string;
  qualityScore: number | null;
  durationMin: number | null;
  reviewNotes: string;
  /** Wall-clock minutes from send to submit — includes idle time, shown as context. */
  elapsedMin: number | null;
}

/** The link a candidate opens. Origin comes from the browser so it is correct
 *  whether the app runs on localhost or a real host. */
function useSubmissionLink(token: string) {
  const [origin, setOrigin] = useState("");
  if (typeof window !== "undefined" && !origin) setOrigin(window.location.origin);
  return `${origin}/assess/${token}`;
}

function CopyLink({ token }: { token: string }) {
  const link = useSubmissionLink(token);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <input readOnly value={link} className={`${inputBase} font-mono text-xs`} />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard blocked — the field is selectable as a fallback */
          }
        }}
        className={`${btnSecondary} shrink-0`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function AssessmentPanel({
  applicationId,
  assessment,
}: {
  applicationId: string;
  assessment: AssessmentView | null;
}) {
  if (!assessment) {
    return <SendForm applicationId={applicationId} />;
  }

  return (
    <div className="space-y-4">
      {/* Candidate link — always available so it can be re-sent */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-ink-muted">
          Candidate submission link — send this to them
        </p>
        <CopyLink token={assessment.token} />
      </div>

      {assessment.status === "sent" && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-muted">
          Sent {assessment.sentAt}. Waiting for the candidate to submit.
        </p>
      )}

      {/* What the candidate returned */}
      {assessment.status !== "sent" && (
        <div className="space-y-3 rounded-lg border border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-medium text-success">Submitted</span>
            {assessment.submittedAt && (
              <span className="text-ink-muted">{assessment.submittedAt}</span>
            )}
            {assessment.elapsedMin !== null && (
              <span className="text-ink-subtle">
                {assessment.elapsedMin} min from send to submit
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {assessment.videoUrl && (
              <a
                href={assessment.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={btnSecondary}
              >
                ▶ Watch recording
              </a>
            )}
            {assessment.outputUrl && (
              <a
                href={assessment.outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={btnSecondary}
              >
                Open output file
              </a>
            )}
          </div>
          {assessment.candidateNote && (
            <p className="text-sm text-ink-muted">
              <span className="font-medium text-ink">Candidate note: </span>
              {assessment.candidateNote}
            </p>
          )}
        </div>
      )}

      {/* Reviewer's verdict */}
      {assessment.status === "reviewed" && assessment.qualityScore !== null && (
        <div className="flex items-start gap-4 rounded-lg border border-line p-4">
          <ScoreRing score={assessment.qualityScore} label="Quality" size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Quality {assessment.qualityScore}/100
              {assessment.durationMin !== null && (
                <span className="ml-2 font-normal text-ink-muted">
                  · {assessment.durationMin} min working time
                </span>
              )}
            </p>
            {assessment.reviewNotes && (
              <p className="mt-1 text-sm whitespace-pre-wrap text-ink-muted">
                {assessment.reviewNotes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Review form appears once the candidate has submitted */}
      {assessment.status !== "sent" && (
        <ReviewForm
          applicationId={applicationId}
          defaults={{
            qualityScore: assessment.qualityScore,
            durationMin: assessment.durationMin,
            reviewNotes: assessment.reviewNotes,
          }}
          reviewed={assessment.status === "reviewed"}
        />
      )}

      {/* Re-send / replace */}
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-muted hover:text-ink">
          Resend or replace this assessment
        </summary>
        <div className="mt-3">
          <SendForm applicationId={applicationId} resend defaultTitle={assessment.title} />
        </div>
      </details>
    </div>
  );
}

function SendForm({
  applicationId,
  resend = false,
  defaultTitle = "Revit modelling test",
}: {
  applicationId: string;
  resend?: boolean;
  defaultTitle?: string;
}) {
  const action = sendAssessment.bind(null, applicationId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-3">
      {!resend && (
        <p className="text-sm text-ink-muted">
          Send a technical test with a private link the candidate can open without an
          account.
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">Test title</label>
        <input name="title" defaultValue={defaultTitle} className={inputBase} />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Instructions</label>
        <textarea
          name="instructions"
          rows={3}
          placeholder="e.g. Model the attached floor plan to LOD 300 in Revit. Set up sheets and a schedule. Record your screen throughout."
          className={inputBase}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Test file link</label>
        <input
          name="testUrl"
          type="url"
          placeholder="Link to the .rvt / .zip on Drive, Dropbox or WeTransfer"
          className={inputBase}
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Upload the file to your own Drive/Dropbox and paste the share link here.
        </p>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending ? "Preparing…" : resend ? "Resend (resets the clock)" : "Create assessment"}
      </button>
    </form>
  );
}

function ReviewForm({
  applicationId,
  defaults,
  reviewed,
}: {
  applicationId: string;
  defaults: { qualityScore: number | null; durationMin: number | null; reviewNotes: string };
  reviewed: boolean;
}) {
  const action = reviewAssessment.bind(null, applicationId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-line p-4">
      <p className="text-xs font-semibold tracking-wide text-ink-subtle uppercase">
        {reviewed ? "Update review" : "Score this submission"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Quality (0–100)</label>
          <input
            name="qualityScore"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={defaults.qualityScore ?? ""}
            className={inputBase}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Working time (min)</label>
          <input
            name="durationMin"
            type="number"
            min={0}
            defaultValue={defaults.durationMin ?? ""}
            placeholder="from the video"
            className={inputBase}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          name="reviewNotes"
          rows={2}
          defaultValue={defaults.reviewNotes}
          placeholder="What was strong, what was missing…"
          className={inputBase}
        />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Saving…" : reviewed ? "Update review" : "Save review"}
      </button>
    </form>
  );
}
