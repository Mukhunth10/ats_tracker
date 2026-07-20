import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
import { logout } from "./login/actions";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BIM ATS — Applicant Tracking",
  description: "Applicant tracking built for BIM software development hiring",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-900 text-sm font-bold text-white">
                B
              </span>
              <span className="text-[15px] font-semibold tracking-tight">BIM ATS</span>
            </Link>
            {/* Nav is pointless to anyone not signed in — every link redirects. */}
            {user && (
              <nav className="flex gap-1 text-sm">
                <Link
                  href="/"
                  className="rounded-md px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Roles
                </Link>
                <Link
                  href="/candidates"
                  className="rounded-md px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  Candidates
                </Link>
              </nav>
            )}

            {user && (
              <div className="ml-auto flex items-center gap-3">
                <span className="text-sm text-slate-500">{user.name}</span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-md px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
