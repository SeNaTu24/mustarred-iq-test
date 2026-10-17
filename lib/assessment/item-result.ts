export type AssessmentItemResultQuestion = {
  id: string;
  round: number;
  roundTitle: string;
  format: string;
  scoringType: "objective" | "behavioral";
  text: string;
  options?: unknown;
  visual?: unknown;
  game?: unknown;
  key?: unknown;
};

export function createAssessmentItemResult({
  attemptId,
  question,
  response,
  isCorrect,
  scoringExplanation,
  questionSetVersion,
  scoringRuleVersion,
  includeScoringType = true,
}: {
  attemptId: string;
  question: AssessmentItemResultQuestion;
  response: unknown;
  isCorrect: boolean;
  scoringExplanation: string;
  questionSetVersion: string;
  scoringRuleVersion: string;
  includeScoringType?: boolean;
}) {
  const isBehavioral = question.scoringType === "behavioral";

  return {
    attempt_id: attemptId,
    question_id: question.id,
    round_number: question.round,
    question_format: question.format,
    question_snapshot: {
      roundTitle: question.roundTitle,
      prompt: question.text,
      options: question.options ?? null,
      visual: question.visual ?? null,
      game: question.game ?? null,
      scoringType: question.scoringType,
    },
    candidate_response: response,
    ...(includeScoringType ? { scoring_type: question.scoringType } : {}),
    key_response: isBehavioral ? null : question.key,
    is_correct: isBehavioral ? null : isCorrect,
    points: isBehavioral ? null : isCorrect ? 1 : 0,
    scoring_explanation: scoringExplanation,
    question_set_version: questionSetVersion,
    scoring_rule_version: scoringRuleVersion,
  };
}
