"use client";

import { useActionState, useState } from "react";
import { updateJobKeywords, type ActionState } from "@/app/actions";

const field =
  "w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

/**
 * Lets a recruiter change what a role screens for and immediately rescore every
 * existing candidate. Without the rescore, edited criteria would leave the
 * ranking stale and silently wrong.
 */
export function KeywordEditor({
  jobId,
  mustHave,
  niceToHave,
  minYears,
}: {
  jobId: string;
  mustHave: string[];
  niceToHave: string[];
  minYears: number;
}) {
  const [open, setOpen] = useState(false);
  const action = updateJobKeywords.bind(null, jobId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
      >
        Edit keywords &amp; rescore
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-xs text-slate-500">
        One keyword per line. Use <code className="rounded bg-slate-100 px-1">|</code>{" "}
        for alternative spellings.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-emerald-700">
          Must have
        </label>
        <textarea
          name="customMustHave"
          rows={5}
          defaultValue={mustHave.join("\n")}
          placeholder={"Primavera P6 | P6\nquantity takeoff"}
          className={field}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Nice to have
        </label>
        <textarea
          name="customNiceToHave"
          rows={4}
          defaultValue={niceToHave.join("\n")}
          placeholder={"NEBOSH\nFIDIC"}
          className={field}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">
          Minimum years
        </label>
        <input
          name="minYears"
          type="number"
          min={0}
          max={40}
          defaultValue={minYears}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Rescoring…" : "Save & rescore all"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          Close
        </button>
      </div>
    </form>
  );
}
