# BIM ATS

Applicant tracking built specifically for **BIM software development** hiring.

The premise: generic ATS keyword matching cannot tell the difference between
someone who has modelled in Revit for ten years and someone who has *written a
Revit API add-in*. For a development team those are completely different hires.
This app is built around that distinction.

**It runs entirely free and offline. No API key, no subscription, no usage limit.**

## What it does

- **Roles** with a BIM-specific skills taxonomy (Revit API, IFC/IfcOpenShell,
  Autodesk Platform Services, Tekla Open API, Dynamo, Speckle, and ~35 more),
  split into must-have and nice-to-have.
- **Resume intake** from PDF, DOCX, TXT or MD, with contact details auto-extracted.
- **Evidence-weighted scoring** — deterministic, instant, unlimited, free.
- **Pipeline** across applied → screening → interview → offer → hired/rejected,
  with per-candidate notes.

### Why the scoring is different

A skill counts fully only when the CV *proves* it:

| CV line | Credit |
| --- | --- |
| "Architected a Revit API add-in suite used by 400 modellers" | **full** |
| "Skills: Revit API, C#, Dynamo" | **half** |
| "Assisted the team, familiar with Revit API" | **half** (hedge detected) |

Two CVs with identical skills lists score **100** and **60** depending on
whether the experience section backs them up. That is what stops a CV written
for the filter from out-ranking a real developer.

Every candidate page shows the exact resume line that earned each skill its
credit, so your team can check the reasoning rather than trust a number.

### Optional: AI screening

There is also a Claude-powered screening feature that adds a written verdict per
candidate. **It is off by default and hidden from the UI** — it costs roughly
$0.04–0.08 per candidate. You never need it; the free scoring does the filtering.
See "Enabling AI screening" below if you ever want it.

## Setup

```bash
cd ats
npm install
npx prisma migrate dev      # creates dev.db
npx tsx prisma/seed.ts      # 4 sample roles + 4 sample candidates
npm run dev                 # http://localhost:3000
```

### Enabling AI screening (optional, costs money)

You do not need this. Skip it unless the free scoring proves too blunt.

To turn it on, add your key to `.env`:

```ini
ANTHROPIC_API_KEY="sk-ant-..."
```

Get one at <https://console.anthropic.com/settings/keys>. Set it to a real key or
leave the line commented out — an empty `""` still wins credential precedence and
breaks authentication.

With no key set, the AI section and its button are **hidden entirely** so nobody
on your team can trigger a charge by accident. Adding a key makes them appear;
removing it hides them again. No other behaviour changes.

To delete the feature permanently: remove `src/lib/score-ai.ts`,
`src/components/screen-button.tsx`, `src/app/api/applications/[id]/screen/`, and
the `screenWithAi` action in `src/app/actions.ts`.

## Tuning the scoring

Three levels, from no-code to code:

**1. Per role, in the browser.** Your HR team ticks must-have and nice-to-have
skills when creating a role, plus minimum years and seniority. No code involved.

**2. `src/lib/bim-taxonomy.ts`** — the skill list. Each entry has a `weight` (1–5)
for how strongly it predicts BIM *development* ability (Revit API is 5, plain
Revit is 3), and `aliases` for the ways it actually appears on CVs (`Forge` vs
`APS`, `IfcOpenShell` vs `ifc open shell`). Add your own stack here.

The same file holds `ACTION_VERBS` (what counts as proving a skill) and
`PASSIVE_CONTEXT` (hedging phrases like "familiar with"). Keep `PASSIVE_CONTEXT`
narrow — an over-broad entry silently demotes real builders. `used` is
deliberately excluded, because "an add-in used by 400 modellers" is a claim of
impact, not a hedge.

**3. `src/lib/score-rules.ts`** — the point split (60% must-have / 20%
nice-to-have / 20% experience) and `LISTED_CREDIT`, the 0.5 multiplier applied to
a skill that is listed but not demonstrated. Lower it to punish keyword-stuffing
harder; raise it toward 1.0 to ignore evidence entirely.

If AI screening is enabled, its rubric is the `RUBRIC` constant in
`src/lib/score-ai.ts`, written in plain English.

## Deploying to Postgres

The schema deliberately avoids enums and array columns so the same models run on
both SQLite and Postgres. Switching takes three edits:

1. `prisma/schema.prisma` — change `provider = "sqlite"` to `"postgresql"`.
2. `.env` — point `DATABASE_URL` at your Postgres instance.
3. `src/lib/db.ts` and `prisma/seed.ts` — swap the driver adapter:

   ```bash
   npm install @prisma/adapter-pg
   npm uninstall @prisma/adapter-better-sqlite3
   ```

   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   ```

Then `npx prisma migrate deploy`. Neon and Supabase both work on their free tiers.

## Before this touches real candidate data

This is a working foundation, not a finished product. Two things are genuinely
missing and both matter legally:

- **There is no authentication.** Every page and every API route is open, and
  Server Actions are reachable by direct POST, not just through the UI. Add an
  auth check at the top of every action in `src/app/actions.ts` and every route
  under `src/app/api/` before exposing this beyond localhost.
- **Resumes are personal data.** Resume text is stored in full in the database.
  With AI screening off, it never leaves your machine. Still add a retention and
  deletion policy.

Also worth knowing: **scores are advisory, not decisions.** The scorer reads
words; it cannot tell that a candidate's "Revit API" work was two lines of
boilerplate, and it will misread unusual CV layouts. Every score links to the
resume line behind it precisely so a human can overrule it. Do not auto-reject
on score alone.

## Architecture

| Path | Purpose |
| --- | --- |
| `src/lib/bim-taxonomy.ts` | Skill definitions, weights, aliases, text detection |
| `src/lib/score-rules.ts` | Deterministic baseline scoring |
| `src/lib/score-ai.ts` | Claude screening — rubric, JSON schema, API call |
| `src/lib/resume-parse.ts` | PDF/DOCX/TXT extraction, contact heuristics |
| `src/app/actions.ts` | Server Actions used by the UI |
| `src/app/api/` | REST routes for external integration (job boards, scripts) |

The UI uses Server Actions; the REST routes exist so a careers page or an
importer can drive the same logic without going through the browser.

Built on Next.js 16 (App Router), Prisma 7, Tailwind 4. Data pages are
`force-dynamic` — Next 16 would otherwise prerender them at build time and serve
stale pipeline counts.
