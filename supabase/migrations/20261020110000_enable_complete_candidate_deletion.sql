begin;

-- Auth deletion must remove the candidate and all dependent records.
alter table public.candidates
  drop constraint candidates_id_fkey,
  add constraint candidates_id_fkey
    foreign key (id) references auth.users(id) on delete cascade;

alter table public.assessment_attempts
  drop constraint assessment_attempts_candidate_id_fkey,
  add constraint assessment_attempts_candidate_id_fkey
    foreign key (candidate_id) references public.candidates(id) on delete cascade;

alter table public.assessment_answers
  drop constraint assessment_answers_attempt_id_fkey,
  add constraint assessment_answers_attempt_id_fkey
    foreign key (attempt_id) references public.assessment_attempts(id) on delete cascade;

alter table public.assessment_results
  drop constraint assessment_results_attempt_id_fkey,
  add constraint assessment_results_attempt_id_fkey
    foreign key (attempt_id) references public.assessment_attempts(id) on delete cascade;

alter table public.assessment_item_results
  drop constraint assessment_item_results_attempt_id_fkey,
  add constraint assessment_item_results_attempt_id_fkey
    foreign key (attempt_id) references public.assessment_attempts(id) on delete cascade;

alter table public.assessment_security_events
  drop constraint assessment_security_events_candidate_id_fkey,
  add constraint assessment_security_events_candidate_id_fkey
    foreign key (candidate_id) references public.candidates(id) on delete cascade;

alter table public.assessment_security_events
  drop constraint assessment_security_events_attempt_id_fkey,
  add constraint assessment_security_events_attempt_id_fkey
    foreign key (attempt_id) references public.assessment_attempts(id) on delete cascade;

-- Preserve result immutability during normal operations, but allow
-- deletion initiated by a cascading parent deletion.
create or replace function public.prevent_assessment_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception 'Finalized assessment results and audit snapshots are immutable.'
    using errcode = '23514';
end;
$$;





commit;
