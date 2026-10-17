-- Assumptions:
-- - A candidate is identified by one verified Supabase Auth user UUID. This
--   does not establish that the account represents a unique real-world person.
-- - Candidate profiles and attempts are managed by trusted server-side code.
--   The server must authorize that the authenticated candidate owns the
--   candidate_id before invoking the attempt-creation function.
-- - Instructions are untimed. The assessment timer starts when the candidate
--   explicitly begins the assessment. The duration is exactly 1,200 seconds;
--   accommodation overrides are not enabled pending an approved policy.
-- - Candidate/account deletion is not implemented. Foreign keys restrict
--   deletion while candidate records or attempts exist.
-- - This migration creates no question, answer, answer-key, or scoring tables.

begin;

create table public.candidates (
  id uuid primary key references auth.users (id) on delete restrict,
  full_name text not null
    check (char_length(btrim(full_name)) between 1 and 120),
  created_at timestamptz not null default transaction_timestamp(),
  updated_at timestamptz not null default transaction_timestamp()
);

comment on table public.candidates is
  'Private candidate profile linked one-to-one to a Supabase Auth user. Email remains in Auth and is not duplicated here.';

comment on column public.candidates.id is
  'Must equal a verified candidate Supabase Auth user ID and is immutable after profile creation.';

create function public.require_verified_candidate_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from auth.users as auth_user
    where auth_user.id = new.id
      and auth_user.email_confirmed_at is not null
  ) then
    raise exception 'A verified Supabase Auth user is required for a candidate profile.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger candidates_require_verified_auth_user
before insert on public.candidates
for each row
execute function public.require_verified_candidate_profile();

create function public.protect_candidate_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Candidate identity and creation time are immutable.'
      using errcode = '23514';
  end if;

  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger candidates_protect_identity
before update on public.candidates
for each row
execute function public.protect_candidate_identity();

create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null unique
    references public.candidates (id) on delete restrict,
  question_set_version text not null
    check (char_length(btrim(question_set_version)) between 1 and 100),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'expired')),
  started_at timestamptz not null,
  duration_seconds integer not null default 1200
    check (duration_seconds = 1200),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz not null,
  constraint assessment_attempts_deadline_matches_duration
    check (deadline_at = started_at + interval '20 minutes'),
  constraint assessment_attempts_lifecycle_timestamps
    check (
      (status = 'in_progress' and submitted_at is null and expired_at is null)
      or
      (status = 'submitted' and submitted_at is not null and expired_at is null)
      or
      (status = 'expired' and submitted_at is null and expired_at is not null)
    ),
  constraint assessment_attempts_submission_time
    check (
      submitted_at is null
      or (submitted_at >= started_at and submitted_at <= deadline_at)
    ),
  constraint assessment_attempts_expiry_time
    check (expired_at is null or expired_at >= deadline_at)
);

comment on table public.assessment_attempts is
  'Private attempt lifecycle metadata. A unique candidate_id enforces at most one attempt per verified Auth account, including abandoned or expired attempts.';

comment on column public.assessment_attempts.candidate_id is
  'References a verified Supabase Auth user through public.candidates. The trusted server must authenticate and authorize the user before starting an attempt.';

comment on column public.assessment_attempts.question_set_version is
  'Identifier for the immutable question set used by the attempt; the question bank and answer keys are deliberately not stored in this public schema.';

comment on column public.assessment_attempts.started_at is
  'Set by the database when the trusted server invokes the begin-attempt function after the candidate explicitly begins.';

comment on column public.assessment_attempts.deadline_at is
  'Exactly 1,200 seconds after started_at. Server-side code must enforce this deadline on answer, resume, submit, and expiry operations.';

comment on column public.assessment_attempts.duration_seconds is
  'Fixed at 1,200 seconds. Accommodation duration changes are not enabled until an approved policy exists.';

create function public.require_verified_attempt_candidate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.candidates as candidate
    join auth.users as auth_user on auth_user.id = candidate.id
    where candidate.id = new.candidate_id
      and auth_user.email_confirmed_at is not null
  ) then
    raise exception 'A verified candidate identity is required for an assessment attempt.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger assessment_attempts_require_verified_candidate
before insert on public.assessment_attempts
for each row
execute function public.require_verified_attempt_candidate();

create function public.enforce_attempt_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_statement_time timestamptz := statement_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.started_at is distinct from current_statement_time
      or new.created_at is distinct from current_statement_time
      or new.duration_seconds <> 1200
      or new.deadline_at is distinct from (new.started_at + interval '20 minutes')
      or new.status <> 'in_progress'
      or new.submitted_at is not null
      or new.expired_at is not null
    then
      raise exception 'Attempts must start now with the standard 1,200-second duration.'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if new.id is distinct from old.id
    or new.candidate_id is distinct from old.candidate_id
    or new.question_set_version is distinct from old.question_set_version
    or new.started_at is distinct from old.started_at
    or new.duration_seconds is distinct from old.duration_seconds
    or new.deadline_at is distinct from old.deadline_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Attempt identity, question-set version, and timing are immutable.'
      using errcode = '23514';
  end if;

  if old.status <> 'in_progress' then
    raise exception 'Submitted and expired attempts are terminal.'
      using errcode = '23514';
  end if;

  if new.status = 'submitted' then
    if new.submitted_at is distinct from current_statement_time
      or new.expired_at is not null
      or current_statement_time > old.deadline_at
    then
      raise exception 'An attempt may only be submitted before its deadline using database time.'
        using errcode = '23514';
    end if;
  elsif new.status = 'expired' then
    if new.expired_at is distinct from current_statement_time
      or new.submitted_at is not null
      or current_statement_time < old.deadline_at
    then
      raise exception 'An attempt may only expire at or after its deadline using database time.'
        using errcode = '23514';
    end if;
  elsif new.status <> 'in_progress'
    or new.submitted_at is not null
    or new.expired_at is not null
  then
    raise exception 'Invalid attempt lifecycle transition.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger assessment_attempts_enforce_lifecycle
before insert or update on public.assessment_attempts
for each row
execute function public.enforce_attempt_lifecycle();

create function public.begin_assessment_attempt(
  requested_candidate_id uuid,
  requested_question_set_version text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_id uuid;
  database_start_time timestamptz := statement_timestamp();
begin
  insert into public.assessment_attempts (
    candidate_id,
    question_set_version,
    status,
    started_at,
    duration_seconds,
    deadline_at,
    created_at
  )
  values (
    requested_candidate_id,
    requested_question_set_version,
    'in_progress',
    database_start_time,
    1200,
    database_start_time + interval '20 minutes',
    database_start_time
  )
  returning id into attempt_id;

  return attempt_id;
end;
$$;

comment on function public.begin_assessment_attempt(uuid, text) is
  'Trusted-server-only entry point to create a single attempt with database-controlled start and 1,200-second deadline. The caller must authorize candidate ownership.';

create function public.finalize_assessment_attempt(
  requested_attempt_id uuid,
  requested_terminal_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row public.assessment_attempts%rowtype;
  database_finalization_time timestamptz := statement_timestamp();
begin
  if requested_terminal_status not in ('submitted', 'expired') then
    raise exception 'Final status must be submitted or expired.'
      using errcode = '22023';
  end if;

  select *
  into attempt_row
  from public.assessment_attempts
  where id = requested_attempt_id
  for update;

  if not found then
    raise exception 'Assessment attempt was not found.'
      using errcode = 'P0002';
  end if;

  if attempt_row.status = requested_terminal_status then
    return attempt_row.id;
  end if;

  if attempt_row.status <> 'in_progress' then
    raise exception 'Submitted and expired attempts are terminal.'
      using errcode = '23514';
  end if;

  if requested_terminal_status = 'submitted'
    and database_finalization_time > attempt_row.deadline_at
  then
    raise exception 'The assessment deadline has passed.'
      using errcode = '23514';
  end if;

  if requested_terminal_status = 'expired'
    and database_finalization_time < attempt_row.deadline_at
  then
    raise exception 'The assessment deadline has not passed.'
      using errcode = '23514';
  end if;

  update public.assessment_attempts
  set status = requested_terminal_status,
      submitted_at = case
        when requested_terminal_status = 'submitted' then database_finalization_time
        else null
      end,
      expired_at = case
        when requested_terminal_status = 'expired' then database_finalization_time
        else null
      end
  where id = requested_attempt_id;

  return attempt_row.id;
end;
$$;

comment on function public.finalize_assessment_attempt(uuid, text) is
  'Trusted-server-only entry point to submit before the database deadline or mark an attempt expired at/after it.';

alter table public.candidates enable row level security;
alter table public.assessment_attempts enable row level security;

revoke all on table public.candidates from public, anon, authenticated;
revoke all on table public.assessment_attempts from public, anon, authenticated;
grant select, insert, update on table public.candidates to service_role;
grant select on table public.assessment_attempts to service_role;

revoke all on function public.require_verified_candidate_profile()
  from public, anon, authenticated;
revoke all on function public.protect_candidate_identity()
  from public, anon, authenticated;
revoke all on function public.require_verified_attempt_candidate()
  from public, anon, authenticated;
revoke all on function public.enforce_attempt_lifecycle()
  from public, anon, authenticated;
revoke all on function public.begin_assessment_attempt(uuid, text)
  from public, anon, authenticated;
revoke all on function public.finalize_assessment_attempt(uuid, text)
  from public, anon, authenticated;

grant execute on function public.begin_assessment_attempt(uuid, text) to service_role;
grant execute on function public.finalize_assessment_attempt(uuid, text) to service_role;

commit;
