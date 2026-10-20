# Mustarred Talent Assessment

Mustarred's application contains a candidate assessment flow and restricted recruiter results. New attempts use the server-scored RCAP assessment: 30 questions drawn from a private 200-question bank, six questions per competency, and a 12-minute server-enforced deadline. The provisional pass threshold is 24/30 (80%). Historical question-set versions remain supported for existing attempts.

Candidate sign-in and verified-email checks use Supabase Auth. Attempt creation, answer persistence, expiry, submission, scoring, and recruiter access are handled by authenticated server routes and Supabase RPCs. The browser receives only the assigned prompts and options, never answer keys or scoring explanations.

The private RCAP examiner workbook is intentionally excluded from source control. Local development uses `RCAP_BANK_PATH`, or the default `assessment-data/Mustarred_RCAP_200_Abstract_Hybrid_Bank_Examiner.xlsx` path. For production, provision the workbook as an object in a private Supabase Storage bucket, then set the server-only `RCAP_BANK_STORAGE_BUCKET` and `RCAP_BANK_STORAGE_OBJECT` values in the deployment environment. The server uses `SUPABASE_SERVICE_ROLE_KEY` to verify and download that private object; the browser never receives the workbook. Production fails closed if either storage setting is missing, incomplete, or points to a public bucket. Do not commit the workbook, place it in public assets, or expose it to candidate-facing code.

The RCAP score is provisional and has not been validated for hiring use. The original 50-question proposal remains documented as a historical product blueprint in [docs/assessment-blueprint.md](./docs/assessment-blueprint.md); it does not describe the current attempt format.

## Run locally

Requires Node.js and npm. Configure the Supabase environment and private RCAP workbook before exercising authenticated assessment flows.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
node --test
npm run lint
npm run build
```

## Current stack

- Next.js App Router 16
- React 19
- TypeScript
- Supabase Auth and server-side Supabase client
- Tailwind CSS 4 (with page styling in `app/globals.css`)
