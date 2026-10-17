begin;

alter table public.assessment_results
  add column behavioral_answered_count integer not null default 0
    check (behavioral_answered_count between 0 and 5),
  add column behavioral_unanswered_count integer not null default 0
    check (behavioral_unanswered_count between 0 and 5),
  add constraint assessment_results_behavioral_counts_match_version
    check (
      (
        question_set_version = 'mustarred-assessment-2026-10-v2'
        and behavioral_answered_count + behavioral_unanswered_count = 5
      )
      or
      (
        question_set_version <> 'mustarred-assessment-2026-10-v2'
        and behavioral_answered_count = 0
        and behavioral_unanswered_count = 0
      )
    );

comment on column public.assessment_results.behavioral_answered_count is
  'Count of completed unscored work-style prompts in question-set v2; these responses do not affect objective scores.';

comment on column public.assessment_results.behavioral_unanswered_count is
  'Count of unanswered unscored work-style prompts in question-set v2.';

alter table public.assessment_item_results
  add column scoring_type text not null default 'objective'
    check (scoring_type in ('objective', 'behavioral')),
  alter column key_response drop not null,
  alter column is_correct drop not null,
  alter column points drop not null,
  drop constraint assessment_item_results_points_match_correctness,
  add constraint assessment_item_results_scoring_type_fields
    check (
      (
        scoring_type = 'objective'
        and key_response is not null
        and is_correct is not null
        and points is not null
        and points = case when is_correct then 1 else 0 end
      )
      or
      (
        scoring_type = 'behavioral'
        and key_response is null
        and is_correct is null
        and points is null
      )
    );

comment on column public.assessment_item_results.scoring_type is
  'Objective items have a private key and score; behavioral responses are retained for descriptive review without a key, correctness value, or points.';

create or replace function public.record_unanswered_demo_items(
  requested_attempt_id uuid,
  requested_question_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_version text;
  expected_count integer;
  terminal_status text;
  inserted_count integer;
begin
  select status, question_set_version
  into terminal_status, attempt_version
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

  if attempt_version = 'mustarred-demo-2026-10-16-v1' then
    expected_count := 50;
  elsif attempt_version = 'mustarred-assessment-2026-10-v2' then
    expected_count := 55;
  else
    raise exception 'Assessment question set version is not supported.'
      using errcode = '22023';
  end if;

  if requested_question_ids is null
    or cardinality(requested_question_ids) <> expected_count
    or (
      select count(distinct supplied.question_id)
      from unnest(requested_question_ids) as supplied(question_id)
    ) <> expected_count
    or exists (
      select 1
      from unnest(requested_question_ids) as supplied(question_id)
      where supplied.question_id is null
        or char_length(btrim(supplied.question_id)) not between 1 and 20
    )
  then
    raise exception 'The complete set of valid question IDs is required.'
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

comment on function public.record_unanswered_demo_items(uuid, text[]) is
  'Trusted-server-only persistence for unanswered question IDs, requiring 50 IDs for v1 or 55 IDs for v2 and a terminal attempt.';

commit;
