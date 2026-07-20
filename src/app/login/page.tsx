import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in? Don't show the form again.
  if (await getSessionUser()) redirect("/");

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-slate-900 text-lg font-bold text-white">
          B
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Construction ATS</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Candidate data is confidential. Do not share your login.
      </p>
    </div>
  );
}
