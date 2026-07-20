"use client";

import { useActionState, useState } from "react";
import { uploadResume, type ActionState } from "@/app/actions";

const field =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900";

/** Common intake channels. Free text, so an unlisted portal still works. */
const SOURCES = [
  "LinkedIn",
  "Indeed",
  "jobs.ie",
  "Careers page",
  "Referral",
  "Agency",
  "Naukri",
  "Email",
  "direct",
];

export function UploadResume({ jobId }: { jobId: string }) {
  const action = uploadResume.bind(null, jobId);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [count, setCount] = useState(0);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">CVs</label>
        <input
          type="file"
          name="resume"
          accept=".pdf,.docx,.txt,.md"
          multiple
          required
          onChange={(e) => setCount(e.target.files?.length ?? 0)}
          className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
        />
        <p className="mt-1.5 text-xs text-slate-500">
          Select many at once. PDF, DOCX, TXT or MD. Scanned image PDFs will not parse.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Came from</label>
        <input
          name="source"
          list="source-options"
          defaultValue="LinkedIn"
          placeholder="LinkedIn, Indeed, jobs.ie…"
          className={field}
        />
        <datalist id="source-options">
          {SOURCES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {count <= 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600 hover:text-slate-900">
            Override parsed contact details
          </summary>
          <div className="mt-2 space-y-2">
            <input name="name" placeholder="Full name" className={field} />
            <input name="email" type="email" placeholder="Email" className={field} />
          </div>
        </details>
      )}

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending
          ? `Parsing and scoring ${count || ""} CV${count === 1 ? "" : "s"}…`
          : count > 1
            ? `Import ${count} CVs`
            : "Add candidate"}
      </button>
    </form>
  );
}
