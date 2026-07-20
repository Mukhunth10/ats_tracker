"use client";

import { useTransition } from "react";
import { moveStage } from "@/app/actions";
import { STAGES, STAGE_STYLE } from "./ui";

/**
 * Inline pipeline-stage control.
 *
 * Deliberately not optimistic: the round trip is a single indexed update, and a
 * stage that snaps back after appearing to change would be worse than a brief
 * dimmed state.
 */
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
      aria-label="Pipeline stage"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => moveStage(applicationId, next));
      }}
      onClick={(e) => e.stopPropagation()}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset transition-opacity duration-150 focus:outline-none ${
        STAGE_STYLE[stage] ?? STAGE_STYLE.applied
      } ${pending ? "opacity-50" : ""}`}
    >
      {STAGES.map((s) => (
        <option key={s} value={s} className="bg-surface text-ink capitalize">
          {s}
        </option>
      ))}
    </select>
  );
}
