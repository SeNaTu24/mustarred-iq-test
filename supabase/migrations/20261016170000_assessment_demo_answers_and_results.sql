begin;

create table public.assessment_answers (
  attempt_id uuid not null
    references public.assessment_attempts (id) on delete restrict,
  question_id text not null
    check (char_length(btrim(question_id)) between 1 and 20),
  response jsonb not null
    check (jsonb_typeof(response) in ('string', 'array', 'object')),
  updated_at timestamptz not null default statement_timestamp(),
  primary key (attempt_id, question_id)
);

comment on table public.assessment_answers is
  'Private candidate responses for the explicitly labelled temporary demo question set. Answer keys are not stored here.';

create table public.assessment_results (
  attempt_id uuid primary key
    references public.assessment_attempts (id) on delete restrict,
  question_set_version text not null,
  total_correct integer not null check (total_correct between 0 and 50),
  round_1_correct integer not null check (round_1_correct between 0 and 10),
  round_2_correct integer not null check (round_2_correct between 0 and 10),
  round_3_correct integer not null check (round_3_correct between 0 and 10),
  round_4_correct integer not null check (round_4_correct between 0 and 10),
  round_5_correct integer not null check (round_5_correct between 0 and 10),
  percentage numeric(5, 2) not null check (percentage between 0 and 100),
  outcome text not null check (outcome in ('PASS', 'FAIL')),
  calculated_at timestamptz not null default statement_timestamp(),
  constraint assessment_results_rounds_sum_to_total
    check (
      total_correct = round_1_correct + round_2_correct + round_3_correct
        + round_4_correct + round_5_correct
    ),
  constraint assessment_results_percentage_matches_total
    check (percentage = total_correct * 2),
  constraint assessment_results_outcome_matches_threshold
    check (outcome = case when total_correct >= 40 then 'PASS' else 'FAIL' end)
);

comment on table public.assessment_results is
  'Private server-calculated demo results. PASS at 40/50 is a temporary mechanical rule, not a validated recruitment recommendation.';

create function public.record_assessment_answer(
  requested_attempt_id uuid,
  requested_question_id text,
  requested_response jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  database_time timestamptz;
  attempt_deadline timestamptz;
  attempt_status text;
begin
  select status, deadline_at
  into attempt_status, attempt_deadline
  from public.assessment_attempts
  where id = requested_attempt_id
  for update;

  if not found then
    raise exception 'Assessment attempt was not found.'
      using errcode = 'P0002';
  end if;

  database_time := clock_timestamp();

  if attempt_status <> 'in_progress' or database_time >= attempt_deadline then
    raise exception 'Assessment attempt is not accepting answers.'
      using errcode = 'P0001';
  end if;

  if requested_question_id is null
    or char_length(btrim(requested_question_id)) not between 1 and 20
    or requested_response is null
    or jsonb_typeof(requested_response) not in ('string', 'array', 'object')
  then
    raise exception 'Invalid answer payload.'
      using errcode = '22023';
  end if;

  insert into public.assessment_answers (
    attempt_id,
    question_id,
    response,
    updated_at
  )
  values (
    requested_attempt_id,
    requested_question_id,
    requested_response,
    database_time
  )
  on conflict (attempt_id, question_id)
  do update set
    response = excluded.response,
    updated_at = excluded.updated_at;

  return database_time;
end;
$$;

alter table public.assessment_answers enable row level security;
alter table public.assessment_results enable row level security;

revoke all on table public.candidates from public, anon, authenticated, service_role;
revoke all on table public.assessment_attempts from public, anon, authenticated, service_role;
grant select, insert on table public.candidates to service_role;
grant select on table public.assessment_attempts to service_role;

revoke all on table public.assessment_answers from public, anon, authenticated;
revoke all on table public.assessment_results from public, anon, authenticated;
revoke all on table public.assessment_answers from service_role;
revoke all on table public.assessment_results from service_role;
grant select on table public.assessment_answers to service_role;
grant select, insert on table public.assessment_results to service_role;

revoke all on function public.record_assessment_answer(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_assessment_answer(uuid, text, jsonb)
  to service_role;

commit;
