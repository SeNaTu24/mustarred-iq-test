-- Consolidated, read-only post-migration verification gate for
-- 20261019143000_add_rcap_30_question_attempts.sql.
-- Run after the migration. One result set: status, object_name, expected, actual.
-- No candidate data or secrets are selected.
WITH expected_absent_constraints(table_name, constraint_name) AS (
  VALUES
    ('assessment_attempts', 'assessment_attempts_duration_seconds_check'),
    ('assessment_item_results', 'assessment_item_results_points_check'),
    ('assessment_results', 'assessment_results_total_correct_check'),
    ('assessment_results', 'assessment_results_answer_counts_sum_to_50'),
    ('assessment_results', 'assessment_results_round_1_correct_check'),
    ('assessment_results', 'assessment_results_round_2_correct_check'),
    ('assessment_results', 'assessment_results_round_3_correct_check'),
    ('assessment_results', 'assessment_results_round_4_correct_check'),
    ('assessment_results', 'assessment_results_round_5_correct_check'),
    ('assessment_results', 'assessment_results_percentage_matches_total'),
    ('assessment_results', 'assessment_results_outcome_matches_threshold')
),
expected_constraints(table_name, constraint_name) AS (
  VALUES
    ('assessment_attempts', 'assessment_attempts_assignment_fingerprint_shape'),
    ('assessment_attempts', 'assessment_attempts_duration_matches_version'),
    ('assessment_attempts', 'assessment_attempts_deadline_matches_duration'),
    ('assessment_item_results', 'assessment_item_results_scoring_type_fields'),
    ('assessment_results', 'assessment_results_total_matches_version'),
    ('assessment_results', 'assessment_results_answer_counts_match_version'),
    ('assessment_results', 'assessment_results_round_scores_match_version'),
    ('assessment_results', 'assessment_results_marks_match_version'),
    ('assessment_results', 'assessment_results_percentage_matches_version'),
    ('assessment_results', 'assessment_results_outcome_matches_version')
),
expected_functions(signature, expected_result, expected_security_definer, anon_execute, authenticated_execute, service_role_execute) AS (
  VALUES
    ('public.enforce_attempt_lifecycle()', 'trigger', false, false, false, false),
    ('public.record_assessment_answer(uuid, text, jsonb)', 'timestamp with time zone', true, false, false, true),
    ('public.record_unanswered_demo_items(uuid, text[])', 'integer', true, false, false, true),
    ('public.begin_rcap_assessment_attempt(uuid, text[], jsonb, text)', 'uuid', true, false, false, true),
    ('public.expire_assessment_attempt_if_due(uuid)', 'text', true, false, false, true)
),
expected_tables(schema_name, table_name) AS (
  VALUES
    ('public', 'candidates'),
    ('public', 'assessment_attempts'),
    ('public', 'assessment_answers'),
    ('public', 'assessment_results'),
    ('public', 'assessment_item_results'),
    ('auth', 'users')
),
expected_columns(schema_name, table_name, column_name, data_type) AS (
  VALUES
    ('public', 'candidates', 'id', 'uuid'),
    ('public', 'candidates', 'full_name', 'text'),
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
),
expected_new_columns(schema_name, table_name, column_name, data_type) AS (
  VALUES
    ('public', 'assessment_attempts', 'assigned_question_ids', 'ARRAY'),
    ('public', 'assessment_attempts', 'assigned_option_orders', 'jsonb'),
    ('public', 'assessment_attempts', 'assignment_fingerprint', 'text'),
    ('public', 'assessment_results', 'marks_earned', 'integer'),
    ('public', 'assessment_results', 'marks_possible', 'integer')
),
expected_indexes(schema_name, table_name, index_name, column_name) AS (
  VALUES
    ('public', 'assessment_attempts', 'assessment_attempts_assignment_fingerprint_unique', 'assignment_fingerprint')
),
expected_keys(table_name, constraint_type, key_columns) AS (
  VALUES
    ('candidates', 'p', ARRAY['id']::text[]),
    ('assessment_attempts', 'p', ARRAY['id']::text[]),
    ('assessment_attempts', 'u', ARRAY['candidate_id']::text[]),
    ('assessment_answers', 'p', ARRAY['attempt_id', 'question_id']::text[]),
    ('assessment_results', 'p', ARRAY['attempt_id']::text[]),
    ('assessment_item_results', 'p', ARRAY['attempt_id', 'question_id']::text[])
),
expected_foreign_keys(table_name, source_columns, referenced_table, referenced_columns) AS (
  VALUES
    ('assessment_attempts', ARRAY['candidate_id']::text[], 'candidates', ARRAY['id']::text[]),
    ('assessment_answers', ARRAY['attempt_id']::text[], 'assessment_attempts', ARRAY['id']::text[]),
    ('assessment_results', ARRAY['attempt_id']::text[], 'assessment_attempts', ARRAY['id']::text[]),
    ('assessment_item_results', ARRAY['attempt_id']::text[], 'assessment_attempts', ARRAY['id']::text[])
),
checks(status, object_name, expected, actual) AS (
  SELECT
    CASE
      WHEN c.oid IS NOT NULL AND c.contype = 'c' AND c.convalidated THEN 'PASS'
      ELSE 'FAIL'
    END,
    'public.' || e.table_name || '.' || e.constraint_name,
    'present, validated CHECK constraint after migration',
    CASE
      WHEN c.oid IS NULL THEN 'absent'
      ELSE 'present | type=' || c.contype::text || ' | validated=' || c.convalidated::text
    END
  FROM expected_constraints AS e
  LEFT JOIN pg_constraint AS c
    ON c.conrelid = to_regclass('public.' || e.table_name)
   AND c.conname = e.constraint_name

  UNION ALL

  SELECT
    CASE WHEN c.oid IS NULL THEN 'PASS' ELSE 'FAIL' END,
    'public.' || e.table_name || '.' || e.constraint_name,
    'absent after migration',
    CASE WHEN c.oid IS NULL THEN 'absent' ELSE 'present' END
  FROM expected_absent_constraints AS e
  LEFT JOIN pg_constraint AS c
    ON c.conrelid = to_regclass('public.' || e.table_name)
   AND c.conname = e.constraint_name

  UNION ALL

  SELECT
    CASE
      WHEN p.oid IS NOT NULL
        AND pg_get_function_result(p.oid) = e.expected_result
        AND p.prosecdef = e.expected_security_definer
        AND has_function_privilege('anon', p.oid, 'EXECUTE') = e.anon_execute
        AND has_function_privilege('authenticated', p.oid, 'EXECUTE') = e.authenticated_execute
        AND has_function_privilege('service_role', p.oid, 'EXECUTE') = e.service_role_execute THEN 'PASS'
      ELSE 'FAIL'
    END,
    e.signature,
    'present | returns=' || e.expected_result
      || ' | security_definer=' || e.expected_security_definer::text
      || ' | anon_execute=' || e.anon_execute::text
      || ' | authenticated_execute=' || e.authenticated_execute::text
      || ' | service_role_execute=' || e.service_role_execute::text,
    CASE
      WHEN p.oid IS NULL THEN 'absent'
      ELSE p.oid::regprocedure::text || ' | returns=' || pg_get_function_result(p.oid)
        || ' | security_definer=' || p.prosecdef::text
        || ' | anon_execute=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text
        || ' | authenticated_execute=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
        || ' | service_role_execute=' || has_function_privilege('service_role', p.oid, 'EXECUTE')::text
    END
  FROM expected_functions AS e
  LEFT JOIN pg_proc AS p ON p.oid = to_regprocedure(e.signature)

  UNION ALL

  SELECT
    CASE
      WHEN t.oid IS NOT NULL
        AND t.tgfoid = to_regprocedure('public.enforce_attempt_lifecycle()')
        AND t.tgenabled IN ('O', 'A') THEN 'PASS'
      ELSE 'FAIL'
    END,
    'public.assessment_attempts.assessment_attempts_enforce_lifecycle',
    'bound to public.enforce_attempt_lifecycle() | enabled for normal writes',
    CASE
      WHEN t.oid IS NULL THEN 'trigger absent'
      ELSE t.tgfoid::regprocedure::text || ' | enabled_for_normal_writes='
        || (t.tgenabled IN ('O', 'A'))::text
    END
  FROM (VALUES (1)) AS one_row(n)
  LEFT JOIN pg_trigger AS t
    ON t.tgrelid = to_regclass('public.assessment_attempts')
   AND t.tgname = 'assessment_attempts_enforce_lifecycle'
   AND NOT t.tgisinternal

  UNION ALL

  SELECT
    CASE WHEN to_regclass(format('%I.%I', e.schema_name, e.table_name)) IS NOT NULL
      THEN 'PASS' ELSE 'FAIL' END,
    e.schema_name || '.' || e.table_name,
    'present',
    CASE WHEN to_regclass(format('%I.%I', e.schema_name, e.table_name)) IS NULL
      THEN 'absent' ELSE 'present' END
  FROM expected_tables AS e

  UNION ALL

  SELECT
    CASE WHEN a.column_name IS NOT NULL AND a.data_type = e.data_type
      THEN 'PASS' ELSE 'FAIL' END,
    e.schema_name || '.' || e.table_name || '.' || e.column_name,
    e.data_type,
    CASE WHEN a.column_name IS NULL THEN 'absent' ELSE a.data_type END
  FROM expected_columns AS e
  LEFT JOIN information_schema.columns AS a
    ON a.table_schema = e.schema_name
   AND a.table_name = e.table_name
   AND a.column_name = e.column_name

  UNION ALL

  SELECT
    CASE WHEN a.column_name IS NOT NULL AND a.data_type = e.data_type
      AND (e.column_name <> 'assigned_question_ids' OR a.udt_name = '_text') THEN 'PASS'
      ELSE 'FAIL' END,
    e.schema_name || '.' || e.table_name || '.' || e.column_name,
    'present with data type ' || e.data_type,
    CASE WHEN a.column_name IS NULL THEN 'absent'
      ELSE a.data_type || CASE WHEN e.column_name = 'assigned_question_ids'
        THEN ' | udt_name=' || a.udt_name ELSE '' END END
  FROM expected_new_columns AS e
  LEFT JOIN information_schema.columns AS a
    ON a.table_schema = e.schema_name
   AND a.table_name = e.table_name
   AND a.column_name = e.column_name

  UNION ALL

  SELECT
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_constraint AS c
      WHERE c.conrelid = to_regclass('public.' || e.table_name)
        AND c.contype::text = e.constraint_type
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = c.conrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = e.key_columns
    ) THEN 'PASS' ELSE 'FAIL' END,
    'public.' || e.table_name || ' key constraint',
    e.constraint_type || ' (' || array_to_string(e.key_columns, ', ') || ')',
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_constraint AS c
      WHERE c.conrelid = to_regclass('public.' || e.table_name)
        AND c.contype::text = e.constraint_type
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = c.conrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = e.key_columns
    ) THEN 'matching key exists' ELSE 'no matching key' END
  FROM expected_keys AS e

  UNION ALL

  SELECT
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_constraint AS c
      WHERE c.conrelid = to_regclass('public.' || e.table_name)
        AND c.confrelid = to_regclass('public.' || e.referenced_table)
        AND c.contype = 'f'
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = c.conrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = e.source_columns
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = c.confrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = e.referenced_columns
    ) THEN 'PASS' ELSE 'FAIL' END,
    'public.' || e.table_name || ' foreign key',
    '(' || array_to_string(e.source_columns, ', ') || ') -> public.'
      || e.referenced_table || '(' || array_to_string(e.referenced_columns, ', ') || ')',
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_constraint AS c
      WHERE c.conrelid = to_regclass('public.' || e.table_name)
        AND c.confrelid = to_regclass('public.' || e.referenced_table)
        AND c.contype = 'f'
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = c.conrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = e.source_columns
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = c.confrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = e.referenced_columns
    ) THEN 'matching foreign key exists' ELSE 'no matching foreign key' END
  FROM expected_foreign_keys AS e

  UNION ALL

  SELECT
    CASE
      WHEN i.indexrelid IS NOT NULL
        AND i.indisunique
        AND i.indisvalid
        AND i.indisready
        AND i.indpred IS NOT NULL
        AND regexp_replace(
          lower(pg_get_expr(i.indpred, i.indrelid)),
          '[[:space:]()]',
          '',
          'g'
        ) = 'assignment_fingerprintisnotnull'
        AND i.indnkeyatts = 1
        AND i.indnatts = 1
        AND ARRAY(
          SELECT a.attname::text
          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = i.indrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        ) = ARRAY[e.column_name]::text[] THEN 'PASS'
      ELSE 'FAIL'
    END,
    e.schema_name || '.' || e.index_name,
    'present, valid, ready, partial UNIQUE index on ' || e.column_name,
    CASE
      WHEN i.indexrelid IS NULL THEN 'absent'
      ELSE 'present | unique=' || i.indisunique::text
        || ' | valid=' || i.indisvalid::text
        || ' | ready=' || i.indisready::text
        || ' | predicate=' || COALESCE(pg_get_expr(i.indpred, i.indrelid), 'none')
        || ' | keys=' || ARRAY(
          SELECT a.attname::text
          FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, ordinality)
          JOIN pg_attribute AS a
            ON a.attrelid = i.indrelid
           AND a.attnum = k.attnum
          ORDER BY k.ordinality
        )::text
    END
  FROM expected_indexes AS e
  LEFT JOIN pg_class AS index_class
    ON index_class.relnamespace = to_regnamespace(e.schema_name)
   AND index_class.relname = e.index_name
   AND index_class.relkind = 'i'
  LEFT JOIN pg_index AS i
    ON i.indexrelid = index_class.oid
   AND i.indrelid = to_regclass(e.schema_name || '.' || e.table_name)
)
SELECT status, object_name, expected, actual
FROM checks
ORDER BY status, object_name;
