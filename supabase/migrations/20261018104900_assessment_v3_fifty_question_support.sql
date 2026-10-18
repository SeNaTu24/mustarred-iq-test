begin;

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

  if attempt_version = 'mustarred-demo-2026-10-16-v1'
    or attempt_version = 'mustarred-assessment-2026-10-v3'
  then
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
  'Trusted-server-only persistence for complete question-ID sets: 50 for v1 and v3, 55 for historical v2.';

commit;
