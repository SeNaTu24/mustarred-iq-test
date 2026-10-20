begin;

-- New attempts are versioned and store their complete server-generated assignment.
-- Existing v1-v3 rows remain unchanged: their assignment columns stay NULL and
-- their duration, results, and historical question-set versions are preserved.
alter table public.assessment_attempts
  add column assigned_question_ids text[],
  add column assigned_option_orders jsonb,
  add column assignment_fingerprint text;

alter table public.assessment_attempts
  add constraint assessment_attempts_assignment_fingerprint_shape
    check (
      assignment_fingerprint is null
      or assignment_fingerprint ~ '^[0-9a-f]{64}$'
    );

create unique index assessment_attempts_assignment_fingerprint_unique
  on public.assessment_attempts (assignment_fingerprint)
  where assignment_fingerprint is not null;

alter table public.assessment_attempts
  drop constraint assessment_attempts_duration_seconds_check,
  drop constraint assessment_attempts_deadline_matches_duration,
  add constraint assessment_attempts_duration_matches_version
    check (
      (question_set_version = 'mustarred-rcap-200-v1' and duration_seconds = 720)
      or
      (question_set_version <> 'mustarred-rcap-200-v1' and duration_seconds = 1200)
    ),
  add constraint assessment_attempts_deadline_matches_duration
    check (deadline_at = started_at + duration_seconds * interval '1 second');

alter table public.assessment_item_results
  drop constraint assessment_item_results_points_check,
  drop constraint assessment_item_results_scoring_type_fields,
  add constraint assessment_item_results_scoring_type_fields
    check (
      (
        scoring_type = 'objective'
        and key_response is not null
        and is_correct is not null
        and points is not null
        and points = case
          when question_set_version = 'mustarred-rcap-200-v1'
            then case when is_correct then 4 else 0 end
          else case when is_correct then 1 else 0 end
        end
      )
      or
      (
        scoring_type = 'behavioral'
        and key_response is null
        and is_correct is null
        and points is null
      )
    );

alter table public.assessment_results
  add column marks_earned integer,
  add column marks_possible integer,
  drop constraint assessment_results_total_correct_check,
  drop constraint assessment_results_answer_counts_sum_to_50,
  drop constraint assessment_results_round_1_correct_check,
  drop constraint assessment_results_round_2_correct_check,
  drop constraint assessment_results_round_3_correct_check,
  drop constraint assessment_results_round_4_correct_check,
  drop constraint assessment_results_round_5_correct_check,
  drop constraint assessment_results_percentage_matches_total,
  drop constraint assessment_results_outcome_matches_threshold,
  add constraint assessment_results_total_matches_version
    check (
      (question_set_version = 'mustarred-rcap-200-v1' and total_correct between 0 and 30)
      or
      (question_set_version <> 'mustarred-rcap-200-v1' and total_correct between 0 and 50)
    ),
  add constraint assessment_results_answer_counts_match_version
    check (
      (question_set_version = 'mustarred-rcap-200-v1' and answered_count + unanswered_count = 30)
      or
      (question_set_version <> 'mustarred-rcap-200-v1' and answered_count + unanswered_count = 50)
    ),
  add constraint assessment_results_round_scores_match_version
    check (
      (
        question_set_version = 'mustarred-rcap-200-v1'
        and round_1_correct between 0 and 6
        and round_2_correct between 0 and 6
        and round_3_correct between 0 and 6
        and round_4_correct between 0 and 6
        and round_5_correct between 0 and 6
      )
      or
      (
        question_set_version <> 'mustarred-rcap-200-v1'
        and round_1_correct between 0 and 10
        and round_2_correct between 0 and 10
        and round_3_correct between 0 and 10
        and round_4_correct between 0 and 10
        and round_5_correct between 0 and 10
      )
    ),
  add constraint assessment_results_marks_match_version
    check (
      (
        question_set_version = 'mustarred-rcap-200-v1'
        and marks_earned is not null
        and marks_earned = total_correct * 4
        and marks_possible is not null
        and marks_possible = 120
      )
      or
      (
        question_set_version <> 'mustarred-rcap-200-v1'
        and marks_earned is null
        and marks_possible is null
      )
    ),
  add constraint assessment_results_percentage_matches_version
    check (
      (
        question_set_version = 'mustarred-rcap-200-v1'
        and percentage = round(total_correct::numeric * 100 / 30, 2)
      )
      or
      (
        question_set_version <> 'mustarred-rcap-200-v1'
        and percentage = total_correct * 2
      )
    ),
  add constraint assessment_results_outcome_matches_version
    check (
      outcome = case
        when question_set_version = 'mustarred-rcap-200-v1'
          then case when total_correct >= 24 then 'PASS' else 'FAIL' end
        else case when total_correct >= 40 then 'PASS' else 'FAIL' end
      end
    );

create or replace function public.enforce_attempt_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  database_time timestamptz;
  expected_duration integer;
  question_id text;
  option_order jsonb;
  option_count integer;
  distinct_option_count integer;
begin
  expected_duration := case
    when new.question_set_version = 'mustarred-rcap-200-v1' then 720
    else 1200
  end;

  if tg_op = 'INSERT' then
    if new.started_at is distinct from statement_timestamp()
      or new.created_at is distinct from statement_timestamp()
      or new.duration_seconds <> expected_duration
      or new.deadline_at is distinct from
        (new.started_at + expected_duration * interval '1 second')
      or new.status <> 'in_progress'
      or new.submitted_at is not null
      or new.expired_at is not null
    then
      raise exception 'Attempt timing or initial status is invalid.'
        using errcode = '23514';
    end if;

    if new.question_set_version = 'mustarred-rcap-200-v1' then
      if new.assigned_question_ids is null
        or cardinality(new.assigned_question_ids) <> 30
        or (
          select count(distinct supplied.question_id)
          from unnest(new.assigned_question_ids) as supplied(question_id)
        ) <> 30
        or exists (
          select 1
          from unnest(new.assigned_question_ids) as supplied(question_id)
          where supplied.question_id is null
            or supplied.question_id !~ '^RCAP-[0-9]{3}$'
        )
        or new.assigned_option_orders is null
        or (
          case
            when jsonb_typeof(new.assigned_option_orders) = 'object' then
              (select count(*) from jsonb_object_keys(new.assigned_option_orders)) <> 30
            else true
          end
        )
        or new.assignment_fingerprint is null
        or new.assignment_fingerprint !~ '^[0-9a-f]{64}$'
      then
        raise exception 'A complete RCAP question assignment is required.'
          using errcode = '22023';
      end if;

      foreach question_id in array new.assigned_question_ids loop
        option_order := new.assigned_option_orders -> question_id;
        if option_order is null or jsonb_typeof(option_order) <> 'array' then
          raise exception 'Each RCAP question needs a stored option order.'
            using errcode = '22023';
        end if;
        option_count := jsonb_array_length(option_order);
        select count(distinct supplied.option_id)
        into distinct_option_count
        from jsonb_array_elements_text(option_order) as supplied(option_id);
        if option_count <> 4
          or distinct_option_count <> 4
          or exists (
            select 1
            from jsonb_array_elements_text(option_order) as supplied(option_id)
            where supplied.option_id not in ('a', 'b', 'c', 'd')
          )
        then
          raise exception 'An RCAP option order must contain each option once.'
            using errcode = '22023';
        end if;
      end loop;
    elsif new.assigned_question_ids is not null
      or new.assigned_option_orders is not null
      or new.assignment_fingerprint is not null
    then
      raise exception 'Historical assessment versions cannot carry an RCAP assignment.'
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
    or new.assigned_question_ids is distinct from old.assigned_question_ids
    or new.assigned_option_orders is distinct from old.assigned_option_orders
    or new.assignment_fingerprint is distinct from old.assignment_fingerprint
  then
    raise exception 'Attempt identity, assignment, version, and timing are immutable.'
      using errcode = '23514';
  end if;

  if old.status <> 'in_progress' then
    raise exception 'Submitted and expired attempts are terminal.'
      using errcode = '23514';
  end if;

  if new.status = 'submitted' then
    database_time := clock_timestamp();
    if database_time >= old.deadline_at then
      new.status := 'expired';
      new.submitted_at := null;
      new.expired_at := database_time;
    else
      new.submitted_at := database_time;
      new.expired_at := null;
    end if;
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

create function public.expire_assessment_attempt_if_due(
  requested_attempt_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_status text;
  attempt_deadline timestamptz;
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

  if attempt_status <> 'in_progress' then
    return attempt_status;
  end if;

  if clock_timestamp() < attempt_deadline then
    return 'in_progress';
  end if;

  update public.assessment_attempts
  set status = 'expired',
      submitted_at = null,
      expired_at = null
  where id = requested_attempt_id
  returning status into attempt_status;

  return attempt_status;
end;
$$;

create function public.begin_rcap_assessment_attempt(
  requested_candidate_id uuid,
  requested_question_ids text[],
  requested_option_orders jsonb,
  requested_assignment_fingerprint text
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
    created_at,
    assigned_question_ids,
    assigned_option_orders,
    assignment_fingerprint
  )
  values (
    requested_candidate_id,
    'mustarred-rcap-200-v1',
    'in_progress',
    database_start_time,
    720,
    database_start_time + interval '12 minutes',
    database_start_time,
    requested_question_ids,
    requested_option_orders,
    requested_assignment_fingerprint
  )
  returning id into attempt_id;

  return attempt_id;
end;
$$;

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
  assigned_question_ids text[];
begin
  select status, deadline_at, question_set_version, assigned_question_ids
  into attempt_status, attempt_deadline, attempt_version, assigned_question_ids
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

  if attempt_version = 'mustarred-rcap-200-v1'
    and (
      assigned_question_ids is null
      or not (requested_question_id = any(assigned_question_ids))
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

  expected_count := case
    when attempt_version = 'mustarred-rcap-200-v1' then 30
    when attempt_version in ('mustarred-demo-2026-10-16-v1', 'mustarred-assessment-2026-10-v3') then 50
    when attempt_version = 'mustarred-assessment-2026-10-v2' then 55
    else null
  end;

  if expected_count is null then
    raise exception 'Assessment question-set version is not supported.'
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
    or (
      attempt_version = 'mustarred-rcap-200-v1'
      and requested_question_ids is distinct from (
        select assigned_question_ids
        from public.assessment_attempts
        where id = requested_attempt_id
      )
    )
  then
    raise exception 'The complete assigned question-ID set is required.'
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

revoke all on function public.begin_rcap_assessment_attempt(uuid, text[], jsonb, text)
  from public, anon, authenticated;
grant execute on function public.begin_rcap_assessment_attempt(uuid, text[], jsonb, text)
  to service_role;
revoke all on function public.expire_assessment_attempt_if_due(uuid)
  from public, anon, authenticated;
grant execute on function public.expire_assessment_attempt_if_due(uuid)
  to service_role;
revoke all on function public.enforce_attempt_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function public.record_unanswered_demo_items(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.record_unanswered_demo_items(uuid, text[])
  to service_role;
revoke all on function public.record_assessment_answer(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.record_assessment_answer(uuid, text, jsonb)
  to service_role;

comment on function public.record_assessment_answer(uuid, text, jsonb) is
  'Trusted-server-only answer persistence. RCAP answers must belong to the immutable assignment; historical versions retain their prior question-ID validation.';
comment on function public.record_unanswered_demo_items(uuid, text[]) is
  'Trusted-server-only unanswered-item persistence: 30 assigned IDs for RCAP, 50 for v1/v3, and 55 for v2.';

commit;
