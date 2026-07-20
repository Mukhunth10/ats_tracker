import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { getSessionUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { btnGhost } from "@/components/ui";
import { logout } from "./login/actions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // avoid invisible text while the font loads
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hirebase — Construction Recruitment",
  description: "Applicant tracking and CV screening for construction hiring",
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
      <body className="flex min-h-full flex-col bg-bg text-ink">
        {/* Keyboard users should not have to tab through the whole header */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-fg"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-fg"
              >
                H
              </span>
              <span className="text-[15px] font-semibold tracking-tight">Hirebase</span>
            </Link>

            {user && <Nav />}

            {user && (
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden text-right sm:block">
                  <p className="text-sm leading-tight font-medium">{user.name}</p>
                  <p className="text-xs text-ink-subtle capitalize">{user.role}</p>
                </div>
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-muted"
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </span>
                <form action={logout}>
                  <button type="submit" className={btnGhost}>
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
