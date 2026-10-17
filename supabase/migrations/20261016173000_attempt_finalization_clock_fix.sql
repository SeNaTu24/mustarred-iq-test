begin;

create or replace function public.enforce_attempt_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  database_time timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.started_at is distinct from statement_timestamp()
      or new.created_at is distinct from statement_timestamp()
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
    database_time := clock_timestamp();
    if database_time > old.deadline_at then
      raise exception 'An attempt may only be submitted before its deadline.'
        using errcode = '23514';
    end if;
    new.submitted_at := database_time;
    new.expired_at := null;
  elsif new.status = 'expired' then
    database_time := clock_timestamp();
    if database_time < old.deadline_at then
      raise exception 'An attempt may only expire at or after its deadline.'
        using errcode = '23514';
    end if;
    new.submitted_at := null;
    new.expired_at := database_time;
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

create or replace function public.finalize_assessment_attempt(
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
  database_finalization_time timestamptz;
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

  database_finalization_time := clock_timestamp();

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
      submitted_at = null,
      expired_at = null
  where id = requested_attempt_id;

  return attempt_row.id;
end;
$$;

revoke all on function public.enforce_attempt_lifecycle()
  from public, anon, authenticated;
revoke all on function public.finalize_assessment_attempt(uuid, text)
  from public, anon, authenticated;
grant execute on function public.finalize_assessment_attempt(uuid, text)
  to service_role;

commit;
