begin;

alter table public.assessment_results
  add column scoring_rule_version text not null default 'demo-scoring-v1'
    check (char_length(btrim(scoring_rule_version)) between 1 and 100),
  add column answered_count integer not null default 0
    check (answered_count between 0 and 50),
  add column unanswered_count integer not null default 50
    check (unanswered_count between 0 and 50),
  add constraint assessment_results_answer_counts_sum_to_50
    check (answered_count + unanswered_count = 50);

comment on column public.assessment_results.question_set_version is
  'Immutable identifier for the question-set content used to calculate this result.';

comment on column public.assessment_results.scoring_rule_version is
  'Immutable identifier for the server-side scoring rules used to calculate this result.';

create table public.assessment_item_results (
  attempt_id uuid not null
    references public.assessment_attempts (id) on delete restrict,
  question_id text not null
    check (char_length(btrim(question_id)) between 1 and 20),
  round_number smallint not null check (round_number between 1 and 5),
  question_format text not null
    check (question_format in ('normal', 'pattern', 'game')),
  question_snapshot jsonb not null
    check (jsonb_typeof(question_snapshot) = 'object'),
  candidate_response jsonb not null
    check (jsonb_typeof(candidate_response) in ('string', 'array', 'object')),
  key_response jsonb not null
    check (jsonb_typeof(key_response) in ('string', 'array', 'object')),
  is_correct boolean not null,
  points smallint not null check (points in (0, 1)),
  scoring_explanation text not null
    check (char_length(btrim(scoring_explanation)) between 1 and 1000),
  question_set_version text not null,
  scoring_rule_version text not null,
  calculated_at timestamptz not null default statement_timestamp(),
  primary key (attempt_id, question_id),
  constraint assessment_item_results_points_match_correctness
    check (points = case when is_correct then 1 else 0 end)
);

comment on table public.assessment_item_results is
  'Private immutable-by-application scoring snapshots for audited demo results. Contains answer keys and must never be exposed to candidates.';

create function public.prevent_assessment_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Finalized assessment results and audit snapshots are immutable.'
    using errcode = '23514';
end;
$$;

create trigger assessment_results_prevent_mutation
before update or delete on public.assessment_results
for each row
execute function public.prevent_assessment_audit_mutation();

create trigger assessment_item_results_prevent_mutation
before update or delete on public.assessment_item_results
for each row
execute function public.prevent_assessment_audit_mutation();

create function public.record_unanswered_demo_items(
  requested_attempt_id uuid,
  requested_question_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  terminal_status text;
  inserted_count integer;
begin
  select status
  into terminal_status
  from public.assessment_attempts
  where id = requested_attempt_id
  for update;

  if not found then
    raise exception 'Assessment attempt was not found.'
      using errcode = 'P0002';
  end if;

  if terminal_status not in ('submitted', 'expired') then
    raise exception 'Unanswered items may only be recorded for a terminal attempt.'
      using errcode = '23514';
  end if;

  if requested_question_ids is null
    or cardinality(requested_question_ids) <> 50
    or (
      select count(distinct supplied.question_id)
      from unnest(requested_question_ids) as supplied(question_id)
    ) <> 50
    or exists (
      select 1
      from unnest(requested_question_ids) as supplied(question_id)
      where supplied.question_id is null
        or char_length(btrim(supplied.question_id)) not between 1 and 20
    )
  then
    raise exception 'Exactly 50 valid question IDs are required.'
      using errcode = '22023';
  end if;

  insert into public.assessment_answers (
    attempt_id,
    question_id,
    response,
    updated_at
  )
  select
    requested_attempt_id,
    supplied.question_id,
    '{"unanswered":true}'::jsonb,
    statement_timestamp()
  from unnest(requested_question_ids) as supplied(question_id)
  on conflict (attempt_id, question_id) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

alter table public.assessment_item_results enable row level security;

revoke all on table public.assessment_item_results from public, anon, authenticated;
revoke all on table public.assessment_answers from service_role;
revoke all on table public.assessment_results from service_role;
revoke all on table public.assessment_item_results from service_role;
grant select on table public.assessment_answers to service_role;
grant select, insert on table public.assessment_results to service_role;
grant select, insert on table public.assessment_item_results to service_role;

revoke all on function public.record_unanswered_demo_items(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.record_unanswered_demo_items(uuid, text[])
  to service_role;

revoke all on function public.prevent_assessment_audit_mutation()
  from public, anon, authenticated, service_role;

commit;
