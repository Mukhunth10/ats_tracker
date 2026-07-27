"use client";

import { useActionState, useState, useTransition } from "react";
import {
  sendAssessment,
  reviewAssessment,
  type ActionState,
} from "@/app/assessments/actions";
import { btnPrimary, btnSecondary, inputBase, ScoreRing } from "./ui";

/** Uploads a staff test file (authed) and returns its stored reference. */
async function uploadTestFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "zip";
  const target = await fetch(`/api/assessment-file?ext=${encodeURIComponent(ext)}`).then((r) =>
    r.json(),
  );
  if (target.error) throw new Error(target.error);

  const res = await fetch(target.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return target.ref;
}

export interface AssessmentView {
  status: "sent" | "submitted" | "reviewed";
  title: string;
  token: string;
  sentAt: string;
  submittedAt: string | null;
  videoUrl: string;
  /** True when videoUrl is an in-app/R2 recording we can embed; false for a
   *  pasted external link, which we only link out to. */
  videoIsFile: boolean;
  /** Consent record — proof of what the candidate agreed to. */
  consentAt: string | null;
  consentScreen: boolean;
  consentCamera: boolean;
  consentNoticeVersion: string;
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
          {/* An in-browser recording plays inline; a pasted link opens out. */}
          {assessment.videoUrl && assessment.videoIsFile && (
            <video
              src={assessment.videoUrl}
              controls
              preload="metadata"
              className="w-full rounded-lg border border-line bg-black"
            />
          )}
          <div className="flex flex-wrap gap-2">
            {assessment.videoUrl && !assessment.videoIsFile && (
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
          {assessment.consentAt && (
            <p className="border-t border-line pt-2 text-xs text-ink-subtle">
              Consent recorded {assessment.consentAt} — screen:{" "}
              {assessment.consentScreen ? "yes" : "no"}, camera:{" "}
              {assessment.consentCamera ? "yes" : "no"} (notice v
              {assessment.consentNoticeVersion || "?"}).
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
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState<ActionState>({});

  // Upload the chosen file (if any) before sending, so a big .zip goes to
  // storage directly rather than through the server action's 1MB limit.
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("testFile");

    setState({});
    try {
      if (file instanceof File && file.size > 0) {
        setUploading(true);
        const ref = await uploadTestFile(file);
        setUploading(false);
        fd.set("testUrl", ref); // the stored reference replaces the link field
      }
    } catch (err) {
      setUploading(false);
      setState({ error: err instanceof Error ? err.message : "File upload failed" });
      return;
    }
    fd.delete("testFile");

    startTransition(async () => {
      const result = await sendAssessment(applicationId, {}, fd);
      setState(result);
      if (result.ok) form.reset();
    });
  }

  const busy = pending || uploading;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {!resend && (
        <p className="text-sm text-ink-muted">
          Send a technical test with a private link the candidate opens without an account.
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
          placeholder="e.g. Model the attached floor plan to LOD 300 in Revit. Set up sheets and a schedule."
          className={inputBase}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Test file</label>
        <input
          type="file"
          name="testFile"
          className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-fg hover:file:bg-primary-hover"
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Upload the .zip / .rvt directly (stored on your own storage), or paste a link
          below instead.
        </p>
        <input
          name="testUrl"
          type="url"
          placeholder="…or a Drive / Dropbox / WeTransfer link"
          className={`${inputBase} mt-2`}
        />
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="text-sm text-success">{state.ok}</p>}
      <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
        {uploading
          ? "Uploading file…"
          : pending
            ? "Preparing…"
            : resend
              ? "Resend (resets the clock)"
              : "Create assessment"}
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
