# Mustarred assessment demo: data access and retention

**Scope:** temporary CEO demonstration only. Demo questions and scores are not
CEO-approved, validated, or suitable for recruitment decisions.

## Stored data

- Supabase Auth holds candidate email, verification state, and the supplied
  full-name metadata.
- `public.candidates` holds the verified Auth user UUID and full name.
- `public.assessment_attempts` holds the question-set version, server start and
  deadline, terminal status, and submission/expiry timestamps. Its unique
  `candidate_id` constraint allows one attempt per Auth account.
- `public.assessment_answers` stores one row per question after finalisation,
  including an explicit `{"unanswered":true}` marker for each unanswered item.
- `public.assessment_results` stores the total, percentage, pass/fail result,
  five round scores, question-set version, scoring-rule version, answered and
  unanswered counts, and calculation timestamp.
- `public.assessment_item_results` stores an auditable per-question snapshot:
  prompt/options, candidate response, protected key, correctness, point value,
  scoring explanation, both versions, and calculation timestamp.

These records contain personal and assessment data. Use only designated test
accounts and fictitious or authorised demo information. Do not enter actual
recruitment candidate details.

## Access controls

RLS is enabled on these tables, and no `anon` or `authenticated` table policies
or grants are added. Browser clients use only the publishable key. Server
routes use `SUPABASE_SERVICE_ROLE_KEY` and must authenticate the caller using
Supabase Auth before acting.

Recruiter API routes require a verified Supabase Auth user with trusted
`app_metadata.role = "recruiter"` or `"recruiter"` in `app_metadata.roles`.
Reviewers sign in at `/recruiter/sign-in`; the server checks the trusted role
before returning results. This role must be assigned through a trusted
Supabase administrator process; the UI does not grant recruiter roles. Do not
use user-editable `user_metadata` for authorization.

Assessment result and per-question audit rows are insert-once. Database
triggers reject updates and deletes, and the trusted server receives only
`SELECT` and `INSERT` grants for result tables. Candidate answer changes are
accepted only while the attempt is in progress; answer writes and attempt
finalization check database time after acquiring the attempt lock.

## Retention and deletion

There is no automated retention job, deletion route, or account-deletion
feature. The foreign keys use restrictive deletion behavior so deleting an Auth
account, candidate, attempt, answer, or result cannot silently erase the audit
chain or make another attempt available. Do not weaken those constraints.

For the CEO demo, retain records only for the demonstration and any explicitly
authorised follow-up review. Before real candidate data is collected, Mustarred
must approve and publish a retention period, lawful processing notice, access
review, and a controlled deletion procedure. Once approved, an administrator
must perform any authorised cleanup as a separately reviewed operation that
preserves required audit/retention obligations. No such deletion is performed
by this application.

## Migration prerequisite

Apply the additive migrations to the intended Supabase database, in this order:

1. `20261016170000_assessment_demo_answers_and_results.sql`
2. `20261016172000_assessment_audit_details.sql`
3. `20261016173000_attempt_finalization_clock_fix.sql`

The initial candidate/attempt migration is already applied and must not be
replayed. Confirm the expected objects and grants in the selected project
before testing. Applying migrations to the hosted project is an explicit
operator action; this implementation does not apply them.
