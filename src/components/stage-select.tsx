"use client";

import { useTransition } from "react";
import { moveStage } from "@/app/actions";
import { STAGES, STAGE_STYLE } from "./ui";

/** Inline pipeline-stage control. Optimism isn't worth it here — the round trip
 *  is a single indexed update and a stale stage would be worse than a flicker. */
export function StageSelect({
  applicationId,
  stage,
}: {
  applicationId: string;
  stage: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={stage}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => moveStage(applicationId, next));
      }}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset outline-none ${
        STAGE_STYLE[stage] ?? STAGE_STYLE.applied
      } ${pending ? "opacity-50" : ""}`}
    >
      {STAGES.map((s) => (
        <option key={s} value={s} className="bg-white text-slate-900">
          {s}
        </option>
      ))}
    </select>
  );
}
