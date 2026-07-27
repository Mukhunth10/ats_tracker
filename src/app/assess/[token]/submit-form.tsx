"use client";

import { useActionState } from "react";
import { submitAssessment, type ActionState } from "@/app/assessments/actions";
import { btnPrimary, inputBase } from "@/components/ui";

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

  return (
    <form action={formAction} className="space-y-4">
      {submitted && !state.ok && (
        <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success ring-1 ring-success-border ring-inset">
          You've already submitted. You can update your links below until we review it.
        </p>
      )}

      <div>
        <label htmlFor="videoUrl" className="mb-1.5 block text-sm font-medium">
          Screen recording link <span className="text-danger">*</span>
        </label>
        <input
          id="videoUrl"
          name="videoUrl"
          type="url"
          required
          defaultValue={defaults.videoUrl}
          placeholder="https://drive.google.com/…  or  https://loom.com/…"
          className={inputBase}
        />
        <p className="mt-1 text-xs text-ink-subtle">
          Make sure the link is set to “anyone with the link can view”.
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
  );
}
