# Mustarred assessment demo: data access and retention

**Scope:** temporary CEO demonstration only. Demo questions and scores are not
CEO-approved, validated, or suitable for recruitment decisions.

## Stored data

- Supabase Auth holds candidate email, verification state, and the supplied
  full-name metadata.
- `public.candidates` holds the verified Auth user UUID and full name.
- `public.assessment_attempts` holds the question-set version, server start and
  deadline, terminal status, submission/expiry timestamps, and (for RCAP) the
  assigned question IDs, option orders, and unique assignment fingerprint. Its
  unique `candidate_id` constraint allows one attempt per Auth account.
- `public.assessment_answers` stores one row per question after finalisation,
  including an explicit `{"unanswered":true}` marker for each unanswered item.
- `public.assessment_results` stores the total, percentage, pass/fail result,
  five round scores, question-set version, scoring-rule version, answered and
  unanswered counts, and calculation timestamp.
- `public.assessment_item_results` stores an auditable per-question snapshot:
  prompt/options, candidate response, protected key, correctness, point value,
  scoring explanation, both versions, and calculation timestamp. RCAP has 30
  objective items worth four points each (120 maximum) and uses a provisional
  24/30 (80%) pass threshold.
- `public.assessment_security_events` stores in-attempt tab visibility and
  window focus/blur events. These events do not affect the score. This document
  does not define a separate retention period for them; include them in the
  approved assessment-data retention and privacy review before real-candidate use.

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

For a fresh local/test database, review the migrations in timestamp order and
confirm which ones are already applied before taking any operator action. The
migration files currently include:

1. `20261016151000_initial_candidate_attempt_schema.sql`
2. `20261016170000_assessment_demo_answers_and_results.sql`
3. `20261016172000_assessment_audit_details.sql`
4. `20261016173000_attempt_finalization_clock_fix.sql`
5. `20261016174000_atomic_attempt_submission.sql`
6. `20261016180000_assessment_v2_behavioral_responses.sql`
7. `20261018104900_assessment_v3_fifty_question_support.sql`
8. `20261018125600_assessment_security_events.sql`
9. `20261018160000_fix_assessment_item_key_response_check.sql`
10. `20261019143000_add_rcap_30_question_attempts.sql`

Do not replay an already-applied migration. Confirm expected objects and grants
in the intended non-production project before testing. Applying any migration,
especially to a hosted or production project, is an explicit operator action;
this application does not apply migrations.
