import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");

  // Self-signup is available only when an invite code is configured.
  const enabled = Boolean(process.env.SIGNUP_CODE);

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
          <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Hirebase — construction recruitment</p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          {enabled ? (
            <SignupForm />
          ) : (
            <p className="text-sm text-ink-muted">
              Self-signup is turned off. Ask your administrator to create an account for
              you.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
