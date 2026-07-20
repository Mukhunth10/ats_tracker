"use client";

import { useActionState, useRef, useEffect } from "react";
import { addNote, type ActionState } from "@/app/actions";

export function NoteForm({ applicationId }: { applicationId: string }) {
  const action = addNote.bind(null, applicationId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);

  // Clear the box once the note is saved, so the next one starts clean.
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <textarea
        name="body"
        rows={3}
        placeholder="Screening notes, interview feedback, follow-ups…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add note"}
      </button>
    </form>
  );
}
