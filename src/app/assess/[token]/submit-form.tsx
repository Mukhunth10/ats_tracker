"use client";

import { useActionState, useState } from "react";
import { submitAssessment, type ActionState } from "@/app/assessments/actions";
import { btnPrimary, inputBase } from "@/components/ui";
import { Recorder } from "./recorder";

export function SubmitForm({
  token,
  submitted,
  defaults,
}: {
  token: string;
  submitted: boolean;
  defaults: { videoUrl: string; outputUrl: string; candidateNote: string };
}) {
  const action = submitAssessment.bind(null, token);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  // The recording produces a storage reference that goes into the videoUrl
  // field. The candidate can instead record elsewhere and paste a link.
  const [consented, setConsented] = useState(false);
  const [videoUrl, setVideoUrl] = useState(defaults.videoUrl);
  const [recorded, setRecorded] = useState(false);

  return (
    <div className="space-y-5">
      {/* --- Consent gate: recording only appears after informed consent --- */}
      <div className="rounded-lg border border-line p-4">
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
          />
          <span className="text-sm text-ink">
            I agree to record my <strong>screen and camera</strong> for this assessment,
            and to the recording being reviewed by the hiring team. I understand my face
            is captured while I work and that this is used only to assess this test.
          </span>
        </label>

        {consented && (
          <div className="mt-4">
            <Recorder
              token={token}
              onUploaded={(ref) => {
                setVideoUrl(ref);
                setRecorded(true);
              }}
            />
          </div>
        )}
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="videoUrl" className="mb-1.5 block text-sm font-medium">
            Screen recording <span className="text-danger">*</span>
          </label>
          <input
            id="videoUrl"
            name="videoUrl"
            required
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Recorded above, or paste a Drive/Loom link"
            readOnly={recorded}
            className={`${inputBase} ${recorded ? "bg-surface-2 text-ink-muted" : ""}`}
          />
          <p className="mt-1 text-xs text-ink-subtle">
            {recorded
              ? "Your in-browser recording is attached."
              : "Record with the button above, or paste a link set to “anyone with the link can view”."}
          </p>
        </div>

        <div>
          <label htmlFor="outputUrl" className="mb-1.5 block text-sm font-medium">
            Your finished file
          </label>
          <input
            id="outputUrl"
            name="outputUrl"
            type="url"
            defaultValue={defaults.outputUrl}
            placeholder="Link to your Revit (.rvt) file"
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="candidateNote" className="mb-1.5 block text-sm font-medium">
            Anything you'd like us to know
          </label>
          <textarea
            id="candidateNote"
            name="candidateNote"
            rows={3}
            defaultValue={defaults.candidateNote}
            placeholder="Optional — assumptions you made, parts you'd refine with more time…"
            className={inputBase}
          />
        </div>

        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger ring-1 ring-danger-border ring-inset"
          >
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success ring-1 ring-success-border ring-inset">
            {state.ok}
          </p>
        )}

        <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
          {pending ? "Submitting…" : submitted ? "Update submission" : "Submit assessment"}
        </button>
      </form>
    </div>
  );
}
