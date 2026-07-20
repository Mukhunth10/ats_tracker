import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in? Don't show the form again.
  if (await getSessionUser()) redirect("/");

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-sm flex-col justify-center">
      <div className="rise">
        <div className="mb-8 text-center">
          <span
            aria-hidden
            className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-fg"
          >
            H
          </span>
          <h1 className="text-xl font-semibold tracking-tight">Sign in to Hirebase</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Construction recruitment and CV screening
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink-subtle">
          Candidate records are confidential.
          <br />
          Do not share your login or leave this open on a shared machine.
        </p>
      </div>
    </div>
  );
}
