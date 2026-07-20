"use client";

import { useActionState } from "react";
import { screenWithAi, type ActionState } from "@/app/actions";

export function ScreenButton({
  applicationId,
  alreadyScored,
}: {
  applicationId: string;
  alreadyScored: boolean;
}) {
  const action = screenWithAi.bind(null, applicationId);
  const [state, formAction, pending] = useActionState<ActionState>(action, {});

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
      >
        {pending
          ? "Reading resume…"
          : alreadyScored
            ? "Re-run AI screening"
            : "Screen with AI"}
      </button>
      {pending && (
        <p className="text-center text-xs text-ink-muted">
          Claude is reading the full resume against the rubric. This takes 20–60 seconds.
        </p>
      )}
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && !pending && <p className="text-sm text-success">{state.ok}</p>}
    </form>
  );
}
