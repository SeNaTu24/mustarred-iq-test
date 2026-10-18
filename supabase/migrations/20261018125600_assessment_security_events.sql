begin;

create table public.assessment_security_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null
    references public.candidates (id) on delete restrict,
  attempt_id uuid not null
    references public.assessment_attempts (id) on delete restrict,
  event_type text not null
    check (event_type in ('tab_hidden', 'tab_visible', 'window_blur', 'window_focus')),
  occurred_at timestamptz not null default statement_timestamp()
);

comment on table public.assessment_security_events is
  'Private, server-recorded assessment focus and visibility events. Separate from answers, scoring snapshots, and results.';

create index assessment_security_events_attempt_time_idx
  on public.assessment_security_events (attempt_id, occurred_at);

alter table public.assessment_security_events enable row level security;
revoke all on table public.assessment_security_events
  from public, anon, authenticated, service_role;

create function public.record_assessment_security_event(
  requested_attempt_id uuid,
  requested_candidate_id uuid,
  requested_event_type text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_status text;
  attempt_deadline timestamptz;
  event_id uuid;
begin
  if requested_event_type is null or requested_event_type not in (
    'tab_hidden',
    'tab_visible',
    'window_blur',
    'window_focus'
  ) then
    raise exception 'Assessment security event type is not supported.'
      using errcode = '22023';
  end if;

  select status, deadline_at
  into attempt_status, attempt_deadline
  from public.assessment_attempts
  where id = requested_attempt_id
    and candidate_id = requested_candidate_id
  for update;

  if not found then
    raise exception 'Active owned assessment attempt was not found.'
      using errcode = 'P0002';
  end if;

  if attempt_status <> 'in_progress'
    or statement_timestamp() >= attempt_deadline
  then
    raise exception 'Assessment attempt is no longer active.'
      using errcode = '23514';
  end if;

  insert into public.assessment_security_events (
    candidate_id,
    attempt_id,
    event_type
  )
  values (
    requested_candidate_id,
    requested_attempt_id,
    requested_event_type
  )
  returning id into event_id;

  return event_id;
end;
$$;

revoke all on function public.record_assessment_security_event(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.record_assessment_security_event(uuid, uuid, text)
  to service_role;

commit;
