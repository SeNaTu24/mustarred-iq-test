-- Read-only preflight for 20261019143000_add_rcap_30_question_attempts.sql.
-- Run BEFORE applying the migration in the Supabase Dashboard SQL Editor.
-- Returns schema flags, aggregate assessment-version counts, and aggregate violations only.
-- No candidate-level identifiers, responses, answer keys, or secrets are selected.

-- 1. Baseline constraints that the migration drops or relies on, plus new
-- constraints that should not exist before migration. Existing constraints must
-- be validated. A false matches_expectation is a stop condition.
WITH expected(table_name, constraint_name, state) AS (
  VALUES
    ('assessment_attempts', 'assessment_attempts_question_set_version_check', 'retain'),
    ('assessment_attempts', 'assessment_attempts_status_check', 'retain'),
    ('assessment_attempts', 'assessment_attempts_duration_seconds_check', 'replace'),
    ('assessment_attempts', 'assessment_attempts_deadline_matches_duration', 'replace'),
    ('assessment_attempts', 'assessment_attempts_lifecycle_timestamps', 'retain'),
    ('assessment_attempts', 'assessment_attempts_submission_time', 'retain'),
    ('assessment_attempts', 'assessment_attempts_expiry_time', 'retain'),
    ('assessment_item_results', 'assessment_item_results_round_number_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_question_format_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_question_snapshot_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_question_id_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_candidate_response_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_points_check', 'replace'),
    ('assessment_item_results', 'assessment_item_results_scoring_explanation_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_scoring_type_check', 'retain'),
    ('assessment_item_results', 'assessment_item_results_scoring_type_fields', 'replace'),
    ('assessment_item_results', 'assessment_item_results_key_response_check', 'retain'),
    ('assessment_answers', 'assessment_answers_question_id_check', 'retain'),
    ('assessment_answers', 'assessment_answers_response_check', 'retain'),
    ('assessment_results', 'assessment_results_total_correct_check', 'replace'),
    ('assessment_results', 'assessment_results_round_1_correct_check', 'replace'),
    ('assessment_results', 'assessment_results_round_2_correct_check', 'replace'),
    ('assessment_results', 'assessment_results_round_3_correct_check', 'replace'),
    ('assessment_results', 'assessment_results_round_4_correct_check', 'replace'),
    ('assessment_results', 'assessment_results_round_5_correct_check', 'replace'),
    ('assessment_results', 'assessment_results_percentage_check', 'retain'),
    ('assessment_results', 'assessment_results_outcome_check', 'retain'),
    ('assessment_results', 'assessment_results_rounds_sum_to_total', 'retain'),
    ('assessment_results', 'assessment_results_percentage_matches_total', 'replace'),
    ('assessment_results', 'assessment_results_outcome_matches_threshold', 'replace'),
    ('assessment_results', 'assessment_results_scoring_rule_version_check', 'retain'),
    ('assessment_results', 'assessment_results_answered_count_check', 'retain'),
    ('assessment_results', 'assessment_results_unanswered_count_check', 'retain'),
    ('assessment_results', 'assessment_results_behavioral_answered_count_check', 'retain'),
    ('assessment_results', 'assessment_results_behavioral_unanswered_count_check', 'retain'),
    ('assessment_results', 'assessment_results_answer_counts_sum_to_50', 'replace'),
    ('assessment_results', 'assessment_results_behavioral_counts_match_version', 'retain'),
    ('assessment_attempts', 'assessment_attempts_assignment_fingerprint_shape', 'new'),
    ('assessment_attempts', 'assessment_attempts_duration_matches_version', 'new'),
    ('assessment_results', 'assessment_results_total_matches_version', 'new'),
    ('assessment_results', 'assessment_results_answer_counts_match_version', 'new'),
    ('assessment_results', 'assessment_results_round_scores_match_version', 'new'),
    ('assessment_results', 'assessment_results_marks_match_version', 'new'),
    ('assessment_results', 'assessment_results_percentage_matches_version', 'new'),
    ('assessment_results', 'assessment_results_outcome_matches_version', 'new')
)
SELECT
  e.table_name,
  e.constraint_name,
  e.state,
  c.oid IS NOT NULL AS present,
  c.convalidated AS validated,
  CASE
    WHEN e.state = 'new' THEN c.oid IS NULL
    ELSE c.oid IS NOT NULL AND c.convalidated
  END AS matches_expectation
FROM expected AS e
LEFT JOIN pg_constraint AS c
  ON c.conrelid = to_regclass('public.' || e.table_name)
 AND c.conname = e.constraint_name
ORDER BY e.table_name, e.constraint_name;

-- 2. Existing triggers and their expected functions. The RCAP migration replaces
-- enforce_attempt_lifecycle(), not its trigger.
WITH expected(table_name, trigger_name, function_name) AS (
  VALUES
    ('assessment_attempts', 'assessment_attempts_enforce_lifecycle', 'enforce_attempt_lifecycle'),
    ('assessment_attempts', 'assessment_attempts_require_verified_candidate', 'require_verified_attempt_candidate'),
    ('assessment_results', 'assessment_results_prevent_mutation', 'prevent_assessment_audit_mutation'),
    ('assessment_item_results', 'assessment_item_results_prevent_mutation', 'prevent_assessment_audit_mutation')
)
SELECT
  e.table_name,
  e.trigger_name,
  t.oid IS NOT NULL AS present,
  COALESCE(t.tgenabled IN ('O', 'A'), false) AS enabled_for_normal_writes,
  COALESCE(p.proname = e.function_name, false) AS function_matches
FROM expected AS e
LEFT JOIN pg_trigger AS t
  ON t.tgrelid = to_regclass('public.' || e.table_name)
 AND t.tgname = e.trigger_name
 AND NOT t.tgisinternal
LEFT JOIN pg_proc AS p
  ON p.oid = t.tgfoid
ORDER BY e.table_name, e.trigger_name;

-- 3. Function signatures, return/security properties, and execute grants.
-- New migration functions should be absent before migration. has_function_privilege
-- includes inherited PUBLIC grants, so anon/authenticated must report false.
WITH expected(signature, present_before, return_type, security_definer, anon_execute, authenticated_execute, service_role_execute) AS (
  VALUES
    ('public.enforce_attempt_lifecycle()', true, 'trigger', false, false, false, false),
    ('public.require_verified_candidate_profile()', true, 'trigger', true, false, false, false),
    ('public.protect_candidate_identity()', true, 'trigger', false, false, false, false),
    ('public.require_verified_attempt_candidate()', true, 'trigger', true, false, false, false),
    ('public.prevent_assessment_audit_mutation()', true, 'trigger', false, false, false, false),
    ('public.begin_assessment_attempt(uuid, text)', true, 'uuid', true, false, false, true),
    ('public.finalize_assessment_attempt(uuid, text)', true, 'uuid', true, false, false, true),
    ('public.finalize_or_get_assessment_attempt(uuid)', true, 'text', true, false, false, true),
    ('public.record_assessment_answer(uuid, text, jsonb)', true, 'timestamp with time zone', true, false, false, true),
    ('public.record_unanswered_demo_items(uuid, text[])', true, 'integer', true, false, false, true),
    ('public.begin_rcap_assessment_attempt(uuid, text[], jsonb, text)', false, 'uuid', true, false, false, true),
    ('public.expire_assessment_attempt_if_due(uuid)', false, 'text', true, false, false, true)
)
SELECT
  e.signature,
  e.present_before,
  p.oid IS NOT NULL AS present,
  CASE
    WHEN p.oid IS NULL THEN NOT e.present_before
    ELSE pg_get_function_result(p.oid) = e.return_type
      AND p.prosecdef = e.security_definer
      AND has_function_privilege('anon', p.oid, 'EXECUTE') = e.anon_execute
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE') = e.authenticated_execute
      AND has_function_privilege('service_role', p.oid, 'EXECUTE') = e.service_role_execute
  END AS matches_pre_migration_expectation,
  CASE WHEN p.oid IS NULL THEN NULL ELSE pg_get_function_result(p.oid) END AS actual_return_type,
  CASE WHEN p.oid IS NULL THEN NULL ELSE p.prosecdef END AS security_definer,
  CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_can_execute,
  CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_can_execute,
  CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('service_role', p.oid, 'EXECUTE') END AS service_role_can_execute
FROM expected AS e
LEFT JOIN pg_proc AS p
  ON p.oid = to_regprocedure(e.signature)
ORDER BY e.signature;

-- 4. Required legacy columns and columns/indexes the migration expects to add.
-- The migration should be applied once, to a pre-RCAP schema.
WITH expected(table_name, column_name, data_type, nullable, should_exist) AS (
  VALUES
    ('assessment_attempts', 'id', 'uuid', 'NO', true),
    ('assessment_attempts', 'candidate_id', 'uuid', 'NO', true),
    ('assessment_attempts', 'question_set_version', 'text', 'NO', true),
    ('assessment_attempts', 'status', 'text', 'NO', true),
    ('assessment_attempts', 'started_at', 'timestamp with time zone', 'NO', true),
    ('assessment_attempts', 'duration_seconds', 'integer', 'NO', true),
    ('assessment_attempts', 'deadline_at', 'timestamp with time zone', 'NO', true),
    ('assessment_attempts', 'submitted_at', 'timestamp with time zone', 'YES', true),
    ('assessment_attempts', 'expired_at', 'timestamp with time zone', 'YES', true),
    ('assessment_attempts', 'created_at', 'timestamp with time zone', 'NO', true),
    ('assessment_attempts', 'assigned_question_ids', 'ARRAY', NULL, false),
    ('assessment_attempts', 'assigned_option_orders', 'jsonb', NULL, false),
    ('assessment_attempts', 'assignment_fingerprint', 'text', NULL, false),
    ('assessment_answers', 'attempt_id', 'uuid', 'NO', true),
    ('assessment_answers', 'question_id', 'text', 'NO', true),
    ('assessment_answers', 'response', 'jsonb', 'NO', true),
    ('assessment_answers', 'updated_at', 'timestamp with time zone', 'NO', true),
    ('assessment_results', 'attempt_id', 'uuid', 'NO', true),
    ('assessment_results', 'question_set_version', 'text', 'NO', true),
    ('assessment_results', 'scoring_rule_version', 'text', 'NO', true),
    ('assessment_results', 'total_correct', 'integer', 'NO', true),
    ('assessment_results', 'round_1_correct', 'integer', 'NO', true),
    ('assessment_results', 'round_2_correct', 'integer', 'NO', true),
    ('assessment_results', 'round_3_correct', 'integer', 'NO', true),
    ('assessment_results', 'round_4_correct', 'integer', 'NO', true),
    ('assessment_results', 'round_5_correct', 'integer', 'NO', true),
    ('assessment_results', 'percentage', 'numeric', 'NO', true),
    ('assessment_results', 'outcome', 'text', 'NO', true),
    ('assessment_results', 'answered_count', 'integer', 'NO', true),
    ('assessment_results', 'unanswered_count', 'integer', 'NO', true),
    ('assessment_results', 'behavioral_answered_count', 'integer', 'NO', true),
    ('assessment_results', 'behavioral_unanswered_count', 'integer', 'NO', true),
    ('assessment_results', 'marks_earned', 'integer', NULL, false),
    ('assessment_results', 'marks_possible', 'integer', NULL, false),
    ('assessment_item_results', 'attempt_id', 'uuid', 'NO', true),
    ('assessment_item_results', 'question_id', 'text', 'NO', true),
    ('assessment_item_results', 'question_set_version', 'text', 'NO', true),
    ('assessment_item_results', 'scoring_type', 'text', 'NO', true),
    ('assessment_item_results', 'key_response', 'jsonb', 'YES', true),
    ('assessment_item_results', 'is_correct', 'boolean', 'YES', true),
    ('assessment_item_results', 'points', 'smallint', 'YES', true)
)
SELECT
  e.table_name,
  e.column_name,
  e.should_exist,
  CASE WHEN c.column_name IS NOT NULL THEN c.data_type END AS actual_data_type,
  CASE WHEN c.column_name IS NOT NULL THEN c.is_nullable END AS actual_nullable,
  CASE
    WHEN e.should_exist THEN
      c.column_name IS NOT NULL
      AND c.data_type = e.data_type
      AND c.is_nullable = e.nullable
      AND (e.column_name <> 'assigned_question_ids' OR c.udt_name = '_text')
    ELSE c.column_name IS NULL
  END AS matches_expectation
FROM expected AS e
LEFT JOIN information_schema.columns AS c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name
ORDER BY e.table_name, e.column_name;

-- The marks columns are added by the RCAP migration. On this pre-migration
-- preflight they are expected to be absent; inspect catalog metadata only.
SELECT
  expected.table_name,
  expected.column_name,
  actual.column_name IS NOT NULL AS exists_before_migration,
  actual.column_name IS NULL AS expected_pre_migration_state
FROM (VALUES
  ('assessment_results', 'marks_earned'),
  ('assessment_results', 'marks_possible')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = 'public'
 AND actual.table_name = expected.table_name
 AND actual.column_name = expected.column_name
ORDER BY expected.table_name, expected.column_name;

SELECT
  'assessment_attempts.candidate_id unique' AS schema_check,
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    JOIN pg_attribute AS a
      ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.conrelid = to_regclass('public.assessment_attempts')
      AND c.contype = 'u'
      AND array_length(c.conkey, 1) = 1
      AND a.attname = 'candidate_id'
  ) AS matches_expectation
UNION ALL
SELECT
  'assessment_answers primary key (attempt_id, question_id)',
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    JOIN pg_attribute AS a1 ON a1.attrelid = c.conrelid AND a1.attnum = c.conkey[1]
    JOIN pg_attribute AS a2 ON a2.attrelid = c.conrelid AND a2.attnum = c.conkey[2]
    WHERE c.conrelid = to_regclass('public.assessment_answers')
      AND c.contype = 'p'
      AND array_length(c.conkey, 1) = 2
      AND a1.attname = 'attempt_id'
      AND a2.attname = 'question_id'
  )
UNION ALL
SELECT
  'assessment_item_results primary key (attempt_id, question_id)',
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    JOIN pg_attribute AS a1 ON a1.attrelid = c.conrelid AND a1.attnum = c.conkey[1]
    JOIN pg_attribute AS a2 ON a2.attrelid = c.conrelid AND a2.attnum = c.conkey[2]
    WHERE c.conrelid = to_regclass('public.assessment_item_results')
      AND c.contype = 'p'
      AND array_length(c.conkey, 1) = 2
      AND a1.attname = 'attempt_id'
      AND a2.attname = 'question_id'
  )
UNION ALL
SELECT
  'assessment_results primary key (attempt_id)',
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.conrelid = to_regclass('public.assessment_results')
      AND c.contype = 'p'
      AND array_length(c.conkey, 1) = 1
      AND a.attname = 'attempt_id'
  )
UNION ALL
SELECT
  'assessment_attempts.candidate_id -> candidates.id FK',
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    JOIN pg_attribute AS s ON s.attrelid = c.conrelid AND s.attnum = c.conkey[1]
    JOIN pg_attribute AS t ON t.attrelid = c.confrelid AND t.attnum = c.confkey[1]
    WHERE c.conrelid = to_regclass('public.assessment_attempts')
      AND c.confrelid = to_regclass('public.candidates')
      AND c.contype = 'f'
      AND array_length(c.conkey, 1) = 1
      AND array_length(c.confkey, 1) = 1
      AND s.attname = 'candidate_id'
      AND t.attname = 'id'
  )
UNION ALL
SELECT
  'assessment_answers.attempt_id -> assessment_attempts.id FK',
  EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    JOIN pg_attribute AS s ON s.attrelid = c.conrelid AND s.attnum = c.conkey[1]
    JOIN pg_attribute AS t ON t.attrelid = c.confrelid AND t.attnum = c.confkey[1]
    WHERE c.conrelid = to_regclass('public.assessment_answers')
      AND c.confrelid = to_regclass('public.assessment_attempts')
      AND c.contype = 'f'
      AND array_length(c.conkey, 1) = 1
      AND array_length(c.confkey, 1) = 1
      AND s.attname = 'attempt_id'
      AND t.attname = 'id'
  )
ORDER BY schema_check;

-- RLS is enabled by the checked-in schema history for these private tables.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'candidates',
    'assessment_attempts',
    'assessment_answers',
    'assessment_results',
    'assessment_item_results'
  )
ORDER BY c.relname;

SELECT
  'RCAP fingerprint unique index absent before migration' AS schema_check,
  to_regclass('public.assessment_attempts_assignment_fingerprint_unique') IS NULL AS matches_expectation;

-- 5. Aggregate version counts only. Unknown and NULL version values are counted
-- without returning their values.
SELECT
  'assessment_attempts' AS table_name,
  count(*) FILTER (WHERE question_set_version = 'mustarred-demo-2026-10-16-v1') AS v1_count,
  count(*) FILTER (WHERE question_set_version = 'mustarred-assessment-2026-10-v2') AS v2_count,
  count(*) FILTER (WHERE question_set_version = 'mustarred-assessment-2026-10-v3') AS v3_count,
  count(*) FILTER (WHERE question_set_version = 'mustarred-rcap-200-v1') AS rcap_count,
  count(*) FILTER (WHERE question_set_version = ANY (ARRAY[
    'mustarred-demo-2026-10-16-v1',
    'mustarred-assessment-2026-10-v2',
    'mustarred-assessment-2026-10-v3',
    'mustarred-rcap-200-v1'
  ]::text[]) IS NOT TRUE) AS unknown_or_null_count
FROM public.assessment_attempts
UNION ALL
SELECT
  'assessment_results',
  count(*) FILTER (WHERE question_set_version = 'mustarred-demo-2026-10-16-v1'),
  count(*) FILTER (WHERE question_set_version = 'mustarred-assessment-2026-10-v2'),
  count(*) FILTER (WHERE question_set_version = 'mustarred-assessment-2026-10-v3'),
  count(*) FILTER (WHERE question_set_version = 'mustarred-rcap-200-v1'),
  count(*) FILTER (WHERE question_set_version = ANY (ARRAY[
    'mustarred-demo-2026-10-16-v1',
    'mustarred-assessment-2026-10-v2',
    'mustarred-assessment-2026-10-v3',
    'mustarred-rcap-200-v1'
  ]::text[]) IS NOT TRUE)
FROM public.assessment_results;

-- 6. Aggregate compatibility violations only. Every predicate uses IS NOT TRUE,
-- so NULL expressions are counted as violations rather than silently passing.
SELECT
  'attempt version/duration/deadline' AS check_name,
  count(*) FILTER (WHERE (
    (question_set_version = 'mustarred-rcap-200-v1'
      AND duration_seconds = 720
      AND deadline_at = started_at + interval '720 seconds')
    OR
    (question_set_version IN (
        'mustarred-demo-2026-10-16-v1',
        'mustarred-assessment-2026-10-v2',
        'mustarred-assessment-2026-10-v3'
      )
      AND duration_seconds = 1200
      AND deadline_at = started_at + interval '1200 seconds')
  ) IS NOT TRUE) AS violation_count
FROM public.assessment_attempts
UNION ALL
SELECT
  'attempt lifecycle timestamps',
  count(*) FILTER (WHERE (
    (status = 'in_progress' AND submitted_at IS NULL AND expired_at IS NULL)
    OR (status = 'submitted' AND submitted_at IS NOT NULL AND expired_at IS NULL)
    OR (status = 'expired' AND submitted_at IS NULL AND expired_at IS NOT NULL)
  ) IS NOT TRUE)
FROM public.assessment_attempts
UNION ALL
SELECT
  'attempt submission/expiry time bounds',
  count(*) FILTER (WHERE (
    (submitted_at IS NULL OR (submitted_at >= started_at AND submitted_at <= deadline_at))
    AND (expired_at IS NULL OR expired_at >= deadline_at)
  ) IS NOT TRUE)
FROM public.assessment_attempts
UNION ALL
SELECT
  'result totals/counts/rounds/percentage/outcome',
  count(*) FILTER (WHERE (
    CASE question_set_version
      WHEN 'mustarred-rcap-200-v1' THEN
        total_correct BETWEEN 0 AND 30
        AND answered_count + unanswered_count = 30
        AND round_1_correct BETWEEN 0 AND 6
        AND round_2_correct BETWEEN 0 AND 6
        AND round_3_correct BETWEEN 0 AND 6
        AND round_4_correct BETWEEN 0 AND 6
        AND round_5_correct BETWEEN 0 AND 6
        AND total_correct = round_1_correct + round_2_correct
          + round_3_correct + round_4_correct + round_5_correct
        AND percentage IS NOT DISTINCT FROM round(total_correct::numeric * 100 / 30, 2)
        AND outcome IS NOT DISTINCT FROM
          CASE WHEN total_correct >= 24 THEN 'PASS' ELSE 'FAIL' END
      WHEN 'mustarred-demo-2026-10-16-v1' THEN
        total_correct BETWEEN 0 AND 50
        AND answered_count + unanswered_count = 50
        AND round_1_correct BETWEEN 0 AND 10
        AND round_2_correct BETWEEN 0 AND 10
        AND round_3_correct BETWEEN 0 AND 10
        AND round_4_correct BETWEEN 0 AND 10
        AND round_5_correct BETWEEN 0 AND 10
        AND total_correct = round_1_correct + round_2_correct
          + round_3_correct + round_4_correct + round_5_correct
        AND percentage IS NOT DISTINCT FROM total_correct * 2
        AND outcome IS NOT DISTINCT FROM
          CASE WHEN total_correct >= 40 THEN 'PASS' ELSE 'FAIL' END
      WHEN 'mustarred-assessment-2026-10-v2' THEN
        total_correct BETWEEN 0 AND 50
        AND answered_count + unanswered_count = 50
        AND round_1_correct BETWEEN 0 AND 10
        AND round_2_correct BETWEEN 0 AND 10
        AND round_3_correct BETWEEN 0 AND 10
        AND round_4_correct BETWEEN 0 AND 10
        AND round_5_correct BETWEEN 0 AND 10
        AND total_correct = round_1_correct + round_2_correct
          + round_3_correct + round_4_correct + round_5_correct
        AND percentage IS NOT DISTINCT FROM total_correct * 2
        AND outcome IS NOT DISTINCT FROM
          CASE WHEN total_correct >= 40 THEN 'PASS' ELSE 'FAIL' END
      WHEN 'mustarred-assessment-2026-10-v3' THEN
        total_correct BETWEEN 0 AND 50
        AND answered_count + unanswered_count = 50
        AND round_1_correct BETWEEN 0 AND 10
        AND round_2_correct BETWEEN 0 AND 10
        AND round_3_correct BETWEEN 0 AND 10
        AND round_4_correct BETWEEN 0 AND 10
        AND round_5_correct BETWEEN 0 AND 10
        AND total_correct = round_1_correct + round_2_correct
          + round_3_correct + round_4_correct + round_5_correct
        AND percentage IS NOT DISTINCT FROM total_correct * 2
        AND outcome IS NOT DISTINCT FROM
          CASE WHEN total_correct >= 40 THEN 'PASS' ELSE 'FAIL' END
      ELSE false
    END
  ) IS NOT TRUE) AS violation_count
FROM public.assessment_results
UNION ALL
SELECT
  'v2 behavioral counts and zero counts for non-v2',
  count(*) FILTER (WHERE (
    CASE question_set_version
      WHEN 'mustarred-assessment-2026-10-v2' THEN
        behavioral_answered_count + behavioral_unanswered_count = 5
      WHEN 'mustarred-demo-2026-10-16-v1' THEN
        behavioral_answered_count = 0 AND behavioral_unanswered_count = 0
      WHEN 'mustarred-assessment-2026-10-v3' THEN
        behavioral_answered_count = 0 AND behavioral_unanswered_count = 0
      WHEN 'mustarred-rcap-200-v1' THEN
        behavioral_answered_count = 0 AND behavioral_unanswered_count = 0
      ELSE false
    END
  ) IS NOT TRUE)
FROM public.assessment_results
UNION ALL
SELECT
  'objective/behavioral item fields and points',
  count(*) FILTER (WHERE (
    CASE
      WHEN scoring_type = 'objective' THEN
        question_set_version IN (
          'mustarred-demo-2026-10-16-v1',
          'mustarred-assessment-2026-10-v2',
          'mustarred-assessment-2026-10-v3',
          'mustarred-rcap-200-v1'
        )
        AND key_response IS NOT NULL
        AND is_correct IS NOT NULL
        AND points IS NOT NULL
        AND points = CASE
          WHEN question_set_version = 'mustarred-rcap-200-v1'
            THEN CASE WHEN is_correct THEN 4 ELSE 0 END
          ELSE CASE WHEN is_correct THEN 1 ELSE 0 END
        END
      WHEN scoring_type = 'behavioral' THEN
        question_set_version = 'mustarred-assessment-2026-10-v2'
        AND key_response IS NULL
        AND is_correct IS NULL
        AND points IS NULL
      ELSE false
    END
  ) IS NOT TRUE) AS violation_count
FROM public.assessment_item_results
UNION ALL
SELECT
  'objective/behavioral item count per attempt',
  count(*) FILTER (WHERE (
    CASE question_set_version
      WHEN 'mustarred-demo-2026-10-16-v1' THEN item_count = 50 AND behavioral_count = 0
      WHEN 'mustarred-assessment-2026-10-v2' THEN item_count = 55 AND behavioral_count = 5
      WHEN 'mustarred-assessment-2026-10-v3' THEN item_count = 50 AND behavioral_count = 0
      WHEN 'mustarred-rcap-200-v1' THEN item_count = 30 AND behavioral_count = 0
      ELSE false
    END
  ) IS NOT TRUE)
FROM (
  SELECT
    attempt_id,
    question_set_version,
    count(*) AS item_count,
    count(*) FILTER (WHERE scoring_type = 'behavioral') AS behavioral_count
  FROM public.assessment_item_results
  GROUP BY attempt_id, question_set_version
) AS per_attempt
UNION ALL
SELECT
  'result question-set version matches its attempt',
  count(*) FILTER (WHERE
    (r.question_set_version IS NOT DISTINCT FROM a.question_set_version) IS NOT TRUE
  )
FROM public.assessment_results AS r
JOIN public.assessment_attempts AS a ON a.id = r.attempt_id
UNION ALL
SELECT
  'item-result question-set version matches its attempt',
  count(*) FILTER (WHERE
    (i.question_set_version IS NOT DISTINCT FROM a.question_set_version) IS NOT TRUE
  )
FROM public.assessment_item_results AS i
JOIN public.assessment_attempts AS a ON a.id = i.attempt_id
UNION ALL
SELECT
  'result scoring rule matches question-set version',
  count(*) FILTER (WHERE (
    CASE question_set_version
      WHEN 'mustarred-demo-2026-10-16-v1' THEN scoring_rule_version = 'mustarred-demo-scoring-v1'
      WHEN 'mustarred-assessment-2026-10-v2' THEN scoring_rule_version = 'mustarred-objective-scoring-v2'
      WHEN 'mustarred-assessment-2026-10-v3' THEN scoring_rule_version = 'mustarred-objective-scoring-v2-50'
      WHEN 'mustarred-rcap-200-v1' THEN scoring_rule_version = 'mustarred-rcap-80pct-v1'
      ELSE false
    END
  ) IS NOT TRUE)
FROM public.assessment_results
UNION ALL
SELECT
  'item scoring rule matches question-set version',
  count(*) FILTER (WHERE (
    CASE question_set_version
      WHEN 'mustarred-demo-2026-10-16-v1' THEN scoring_rule_version = 'mustarred-demo-scoring-v1'
      WHEN 'mustarred-assessment-2026-10-v2' THEN scoring_rule_version = 'mustarred-objective-scoring-v2'
      WHEN 'mustarred-assessment-2026-10-v3' THEN scoring_rule_version = 'mustarred-objective-scoring-v2-50'
      WHEN 'mustarred-rcap-200-v1' THEN scoring_rule_version = 'mustarred-rcap-80pct-v1'
      ELSE false
    END
  ) IS NOT TRUE)
FROM public.assessment_item_results;
