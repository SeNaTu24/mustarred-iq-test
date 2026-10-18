begin;

alter table public.assessment_item_results
  drop constraint assessment_item_results_key_response_check;

alter table public.assessment_item_results
  add constraint assessment_item_results_key_response_check
  check (
    (
      scoring_type = 'objective'
      and jsonb_typeof(key_response) in ('string', 'array', 'object')
    )
    or
    (
      scoring_type = 'behavioral'
      and key_response is null
    )
  );

commit;
