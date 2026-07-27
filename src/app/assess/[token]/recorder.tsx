"use client";

import { useRef, useState } from "react";

type Phase = "idle" | "recording" | "uploading" | "done" | "error";

/**
 * In-browser screen recorder.
 *
 * Uses the standard browser APIs — getDisplayMedia to capture the screen,
 * MediaRecorder to encode it — so there is nothing to install and no cost. It
 * is cooperative by design: the browser shows the candidate a permission prompt
 * and they choose what to share. Covert capture is impossible here (and illegal
 * under GDPR), which is exactly right.
 *
 * On stop, the recording is uploaded — straight to Cloudflare R2 via a presigned
 * URL when configured, otherwise to the app's own disk. The resulting reference
 * is handed back so the submission form can save it.
 *
 * Requires a secure context (https or localhost); getDisplayMedia is blocked on
 * plain http, so a LAN IP like http://192.168.x.x will not work — use the tunnel
 * URL or localhost.
 */
export function Recorder({
  token,
  onUploaded,
}: {
  token: string;
  onUploaded: (ref: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    typeof window.MediaRecorder === "function";

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 10 }, // low frame rate keeps the file small
        audio: false,
      });
      streamRef.current = stream;

      // If the candidate stops sharing from the browser's own bar, treat it as
      // stop-and-upload rather than losing the recording.
      stream.getVideoTracks()[0].addEventListener("ended", () => stop());

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = upload;
      rec.start(1000); // gather a chunk each second
      recorderRef.current = rec;

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setPhase("recording");
    } catch (err) {
      // Permission denied / cancelled is the common case — not an error to shout about.
      const msg = err instanceof Error ? err.message : "Could not start recording";
      setError(
        /denied|Permission/i.test(msg)
          ? "Screen sharing was cancelled. Click record and choose “Entire Screen”."
          : msg,
      );
      setPhase("idle");
    }
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }

  async function upload() {
    setPhase("uploading");
    setProgress(0);
    try {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });

      // Ask the server where to put it (R2 presigned URL, or a local route).
      const target = await fetch(`/api/assess/${token}/upload`).then((r) => r.json());
      if (target.error) throw new Error(target.error);

      // XHR rather than fetch so we get real upload progress.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(target.mode === "r2" ? "PUT" : "PUT", target.uploadUrl);
        xhr.setRequestHeader("Content-Type", "video/webm");
        xhr.upload.onprogress = (e) =>
          e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error("Upload failed — check your connection."));
        xhr.send(blob);
      });

      onUploaded(target.ref);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPhase("error");
    }
  }

  if (!supported) {
    return (
      <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-muted">
        Your browser can't record the screen here. Use Chrome or Edge on a computer, or
        record with a separate tool and paste the link below.
      </p>
    );
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-4">
      <p className="text-sm font-medium">Record your screen in the browser</p>
      <p className="mt-1 text-xs text-ink-muted">
        Click record, then choose <strong>Entire Screen</strong> so your Revit window is
        captured. Recording uploads automatically when you stop.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {phase === "idle" && (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-white" /> Start recording
          </button>
        )}

        {phase === "recording" && (
          <>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-danger">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" />
              Recording {mmss}
            </span>
            <button
              type="button"
              onClick={stop}
              className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
            >
              Stop &amp; upload
            </button>
          </>
        )}

        {phase === "uploading" && (
          <div className="w-full">
            <p className="text-sm text-ink-muted">Uploading… {progress}%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-primary transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {phase === "done" && (
          <span className="text-sm font-medium text-success">
            ✓ Recording uploaded — now submit below.
          </span>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={start}
            className="rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-hover"
          >
            Try again
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
