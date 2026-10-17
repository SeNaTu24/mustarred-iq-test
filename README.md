# Mustarred Talent Assessment

The current application is a responsive candidate-facing design preview for
Mustarred's talent assessment. It introduces the five proposed focus areas,
explains the product's people-first approach, and includes candidate welcome
and assessment-instructions previews with one unscored practice question.

The welcome form validates example details in the browser, then clears them.
It does not send or save personal information or start an assessment.
The instructions describe the planned five-round, 50-question, 20-minute
format. The practice question is interactive and unscored. Production candidate
registration, scored assessment questions, timing, persistence, scoring, and
recruiter tools are not implemented yet.

## Run locally

Requires Node.js and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npm run lint
npm run build
```

## Current stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS 4 (with page styling in `app/globals.css`)
