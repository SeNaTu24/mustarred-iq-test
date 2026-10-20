-- Read-only structural preflight for
-- 20261019143000_add_rcap_30_question_attempts.sql.
-- Run against the pre-migration Supabase schema. Every statement is SELECT/CTE-only.
-- No candidate rows, answer data, workbook contents, or secrets are read.

-- 1. Exact constraints dropped/replaced by the migration must exist as validated
-- CHECK constraints. Constraints added by the migration must not already exist.
WITH expected(table_name, constraint_name, action) AS (
  VALUES
    ('assessment_attempts', 'assessment_attempts_duration_seconds_check', 'drop'),
    ('assessment_attempts', 'assessment_attempts_deadline_matches_duration', 'replace'),
    ('assessment_item_results', 'assessment_item_results_points_check', 'drop'),
    ('assessment_item_results', 'assessment_item_results_scoring_type_fields', 'replace'),
    ('assessment_results', 'assessment_results_total_correct_check', 'drop'),
    ('assessment_results', 'assessment_results_answer_counts_sum_to_50', 'drop'),
    ('assessment_results', 'assessment_results_round_1_correct_check', 'drop'),
    ('assessment_results', 'assessment_results_round_2_correct_check', 'drop'),
    ('assessment_results', 'assessment_results_round_3_correct_check', 'drop'),
    ('assessment_results', 'assessment_results_round_4_correct_check', 'drop'),
    ('assessment_results', 'assessment_results_round_5_correct_check', 'drop'),
    ('assessment_results', 'assessment_results_percentage_matches_total', 'drop'),
    ('assessment_results', 'assessment_results_outcome_matches_threshold', 'drop'),
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
  CASE
    WHEN e.action = 'new' AND c.oid IS NULL THEN 'PASS'
    WHEN e.action = 'new' THEN 'FAIL'
    WHEN c.contype = 'c' AND c.convalidated THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  e.table_name,
  e.constraint_name,
  e.action AS expected,
  CASE
    WHEN c.oid IS NULL THEN 'absent'
    ELSE 'present | type=' || c.contype::text || ' | validated=' || c.convalidated::text
  END AS actual
FROM expected AS e
LEFT JOIN pg_constraint AS c
  ON c.conrelid = to_regclass('public.' || e.table_name)
 AND c.conname = e.constraint_name
ORDER BY e.table_name, e.constraint_name;

-- 2. Existing functions that are replaced must have the exact expected
-- signatures and return types. Functions created by the migration must be absent
-- before it runs; presence would make CREATE FUNCTION conflict.
WITH expected(signature, must_exist, return_type) AS (
  VALUES
    ('public.enforce_attempt_lifecycle()', true, 'trigger'),
    ('public.record_assessment_answer(uuid, text, jsonb)', true, 'timestamp with time zone'),
    ('public.record_unanswered_demo_items(uuid, text[])', true, 'integer'),
    ('public.begin_rcap_assessment_attempt(uuid, text[], jsonb, text)', false, 'uuid'),
    ('public.expire_assessment_attempt_if_due(uuid)', false, 'text')
),
resolved AS (
  SELECT e.*, to_regprocedure(e.signature) AS function_oid
  FROM expected AS e
)
SELECT
  CASE
    WHEN r.must_exist AND p.oid IS NOT NULL
      AND pg_get_function_result(p.oid) = r.return_type THEN 'PASS'
    WHEN NOT r.must_exist AND p.oid IS NULL THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  r.signature,
  CASE WHEN r.must_exist THEN 'present with return type ' || r.return_type ELSE 'absent' END AS expected,
  CASE
    WHEN p.oid IS NULL THEN 'absent'
    ELSE p.oid::regprocedure::text || ' | returns ' || pg_get_function_result(p.oid)
  END AS actual
FROM resolved AS r
LEFT JOIN pg_proc AS p ON p.oid = r.function_oid
ORDER BY r.signature;

-- 3. The lifecycle trigger must already be bound to the function being replaced
-- and enabled for ordinary writes.
WITH expected(table_name, trigger_name, function_signature) AS (
  VALUES (
    'assessment_attempts',
    'assessment_attempts_enforce_lifecycle',
    'public.enforce_attempt_lifecycle()'
  )
), resolved AS (
  SELECT e.*, to_regprocedure(e.function_signature) AS expected_function_oid
  FROM expected AS e
)
SELECT
  CASE
    WHEN t.oid IS NOT NULL
      AND t.tgfoid = r.expected_function_oid
      AND t.tgenabled IN ('O', 'A') THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  r.table_name || '.' || r.trigger_name AS object_name,
  r.function_signature || ' enabled for ordinary writes' AS expected,
  CASE
    WHEN t.oid IS NULL THEN 'trigger absent'
    ELSE t.tgfoid::regprocedure::text || ' | enabled=' || (t.tgenabled IN ('O', 'A'))::text
  END AS actual
FROM resolved AS r
LEFT JOIN pg_trigger AS t
  ON t.tgrelid = to_regclass('public.' || r.table_name)
 AND t.tgname = r.trigger_name
 AND NOT t.tgisinternal;

-- 4. Base relations required by existing schema constraints and affected RPCs.
WITH expected(schema_name, table_name) AS (
  VALUES
    ('public', 'candidates'),
    ('public', 'assessment_attempts'),
    ('public', 'assessment_answers'),
    ('public', 'assessment_results'),
    ('public', 'assessment_item_results'),
    ('auth', 'users')
)
SELECT
  CASE WHEN to_regclass(format('%I.%I', e.schema_name, e.table_name)) IS NOT NULL
    THEN 'PASS' ELSE 'FAIL' END AS status,
  e.schema_name || '.' || e.table_name AS object_name,
  'present' AS expected,
  CASE WHEN to_regclass(format('%I.%I', e.schema_name, e.table_name)) IS NULL
    THEN 'absent' ELSE 'present' END AS actual
FROM expected AS e
ORDER BY e.schema_name, e.table_name;

-- Primary/unique keys required by the candidate attempt policy and answer/result
-- upsert paths, plus foreign keys relied on by their RPCs.
WITH expected(table_name, constraint_type, column_names) AS (
  VALUES
    ('assessment_attempts', 'u', ARRAY['candidate_id']::text[]),
    ('assessment_answers', 'p', ARRAY['attempt_id', 'question_id']::text[]),
    ('assessment_results', 'p', ARRAY['attempt_id']::text[]),
    ('assessment_item_results', 'p', ARRAY['attempt_id', 'question_id']::text[])
)
SELECT
  CASE WHEN EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = to_regclass('public.' || e.table_name)
      AND c.contype = e.constraint_type
      AND array_length(c.conkey, 1) = cardinality(e.column_names)
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(e.column_names) WITH ORDINALITY AS expected_column(column_name, ordinal)
        LEFT JOIN unnest(c.conkey) WITH ORDINALITY AS actual_key(attnum, ordinal)
          USING (ordinal)
        LEFT JOIN pg_attribute AS a
          ON a.attrelid = c.conrelid
         AND a.attnum = actual_key.attnum
        WHERE a.attname IS DISTINCT FROM expected_column.column_name
      )
  ) THEN 'PASS' ELSE 'FAIL' END AS status,
  e.table_name || ' ' || e.constraint_type || ' key' AS object_name,
  array_to_string(e.column_names, ', ') AS expected,
  CASE WHEN EXISTS (
    SELECT 1
    FROM pg_constraint AS c
    WHERE c.conrelid = to_regclass('public.' || e.table_name)
      AND c.contype = e.constraint_type
      AND array_length(c.conkey, 1) = cardinality(e.column_names)
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(e.column_names) WITH ORDINALITY AS expected_column(column_name, ordinal)
        LEFT JOIN unnest(c.conkey) WITH ORDINALITY AS actual_key(attnum, ordinal)
          USING (ordinal)
        LEFT JOIN pg_attribute AS a
          ON a.attrelid = c.conrelid
         AND a.attnum = actual_key.attnum
        WHERE a.attname IS DISTINCT FROM expected_column.column_name
      )
  ) THEN 'matching key exists' ELSE 'no matching key' END AS actual
FROM expected AS e
ORDER BY e.table_name, e.constraint_type;

-- 5. Base columns used by the migration's table constraints, trigger/RPC bodies,
-- and existing assessment writes. Migration-added columns are intentionally not
-- listed here; their expected absence is checked in section 6 via catalog data.
WITH expected(schema_name, table_name, column_name, data_type) AS (
  VALUES
    ('public', 'candidates', 'id', 'uuid'),
    ('public', 'assessment_attempts', 'id', 'uuid'),
    ('public', 'assessment_attempts', 'candidate_id', 'uuid'),
    ('public', 'assessment_attempts', 'question_set_version', 'text'),
    ('public', 'assessment_attempts', 'status', 'text'),
    ('public', 'assessment_attempts', 'started_at', 'timestamp with time zone'),
    ('public', 'assessment_attempts', 'duration_seconds', 'integer'),
    ('public', 'assessment_attempts', 'deadline_at', 'timestamp with time zone'),
    ('public', 'assessment_attempts', 'submitted_at', 'timestamp with time zone'),
    ('public', 'assessment_attempts', 'expired_at', 'timestamp with time zone'),
    ('public', 'assessment_attempts', 'created_at', 'timestamp with time zone'),
    ('public', 'assessment_answers', 'attempt_id', 'uuid'),
    ('public', 'assessment_answers', 'question_id', 'text'),
    ('public', 'assessment_answers', 'response', 'jsonb'),
    ('public', 'assessment_answers', 'updated_at', 'timestamp with time zone'),
    ('public', 'assessment_results', 'attempt_id', 'uuid'),
    ('public', 'assessment_results', 'question_set_version', 'text'),
    ('public', 'assessment_results', 'scoring_rule_version', 'text'),
    ('public', 'assessment_results', 'total_correct', 'integer'),
    ('public', 'assessment_results', 'round_1_correct', 'integer'),
    ('public', 'assessment_results', 'round_2_correct', 'integer'),
    ('public', 'assessment_results', 'round_3_correct', 'integer'),
    ('public', 'assessment_results', 'round_4_correct', 'integer'),
    ('public', 'assessment_results', 'round_5_correct', 'integer'),
    ('public', 'assessment_results', 'percentage', 'numeric'),
    ('public', 'assessment_results', 'outcome', 'text'),
    ('public', 'assessment_results', 'answered_count', 'integer'),
    ('public', 'assessment_results', 'unanswered_count', 'integer'),
    ('public', 'assessment_results', 'behavioral_answered_count', 'integer'),
    ('public', 'assessment_results', 'behavioral_unanswered_count', 'integer'),
    ('public', 'assessment_item_results', 'attempt_id', 'uuid'),
    ('public', 'assessment_item_results', 'question_id', 'text'),
    ('public', 'assessment_item_results', 'round_number', 'smallint'),
    ('public', 'assessment_item_results', 'question_format', 'text'),
    ('public', 'assessment_item_results', 'question_snapshot', 'jsonb'),
    ('public', 'assessment_item_results', 'candidate_response', 'jsonb'),
    ('public', 'assessment_item_results', 'key_response', 'jsonb'),
    ('public', 'assessment_item_results', 'is_correct', 'boolean'),
    ('public', 'assessment_item_results', 'points', 'smallint'),
    ('public', 'assessment_item_results', 'scoring_explanation', 'text'),
    ('public', 'assessment_item_results', 'question_set_version', 'text'),
    ('public', 'assessment_item_results', 'scoring_rule_version', 'text'),
    ('public', 'assessment_item_results', 'scoring_type', 'text'),
    ('auth', 'users', 'id', 'uuid'),
    ('auth', 'users', 'email_confirmed_at', 'timestamp with time zone')
)
SELECT
  CASE WHEN actual.column_name IS NOT NULL AND actual.data_type = e.data_type
    THEN 'PASS' ELSE 'FAIL' END AS status,
  e.schema_name || '.' || e.table_name || '.' || e.column_name AS object_name,
  e.data_type AS expected,
  CASE
    WHEN actual.column_name IS NULL THEN 'absent'
    ELSE actual.data_type
  END AS actual
FROM expected AS e
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = e.schema_name
 AND actual.table_name = e.table_name
 AND actual.column_name = e.column_name
ORDER BY e.schema_name, e.table_name, e.column_name;

-- 6. These columns and index are created by the migration and should be absent
-- in the pre-migration schema. Check only catalogs; never select their values.
WITH expected(schema_name, table_name, column_name) AS (
  VALUES
    ('public', 'assessment_attempts', 'assigned_question_ids'),
    ('public', 'assessment_attempts', 'assigned_option_orders'),
    ('public', 'assessment_attempts', 'assignment_fingerprint'),
    ('public', 'assessment_results', 'marks_earned'),
    ('public', 'assessment_results', 'marks_possible')
)
SELECT
  CASE WHEN actual.column_name IS NULL THEN 'PASS' ELSE 'FAIL' END AS status,
  e.schema_name || '.' || e.table_name || '.' || e.column_name AS object_name,
  'absent before migration' AS expected,
  CASE WHEN actual.column_name IS NULL THEN 'absent' ELSE 'present' END AS actual
FROM expected AS e
LEFT JOIN information_schema.columns AS actual
  ON actual.table_schema = e.schema_name
 AND actual.table_name = e.table_name
 AND actual.column_name = e.column_name
UNION ALL
SELECT
  CASE WHEN to_regclass('public.assessment_attempts_assignment_fingerprint_unique') IS NULL
    THEN 'PASS' ELSE 'FAIL' END,
  'public.assessment_attempts_assignment_fingerprint_unique',
  'absent before migration',
  CASE WHEN to_regclass('public.assessment_attempts_assignment_fingerprint_unique') IS NULL
    THEN 'absent' ELSE 'present' END;
