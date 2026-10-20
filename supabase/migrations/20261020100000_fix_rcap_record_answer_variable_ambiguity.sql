begin;

-- Qualify the selected assignment column and use a distinct PL/pgSQL variable
-- name so the answer RPC works with PostgreSQL's default variable_conflict=error.
create or replace function public.record_assessment_answer(
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
  attempt_version text;
  attempt_question_ids text[];
begin
  select a.status, a.deadline_at, a.question_set_version, a.assigned_question_ids
  into attempt_status, attempt_deadline, attempt_version, attempt_question_ids
  from public.assessment_attempts as a
  where a.id = requested_attempt_id
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

  if attempt_version = 'mustarred-rcap-200-v1'
    and (
      attempt_question_ids is null
      or not (requested_question_id = any(attempt_question_ids))
    )
  then
    raise exception 'The question is not part of this RCAP assignment.'
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

revoke all on function public.record_assessment_answer(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_assessment_answer(uuid, text, jsonb)
  to service_role;

commit;
