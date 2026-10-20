export type AssessmentItemResultQuestion = {
  id: string;
  round: number;
  roundTitle: string;
  format: string;
  scoringType: "objective" | "behavioral";
  competency?: string;
  questionType?: "Abstract" | "Practical";
  difficulty?: "Hard" | "Exceptionally hard";
  text: string;
  options?: unknown;
  visual?: unknown;
  game?: unknown;
  key?: unknown;
};

export type AssessmentResponseQuestion = Pick<
  AssessmentItemResultQuestion,
  "game"
>;

function isRotationQuestion(question: AssessmentResponseQuestion): boolean {
  const game = question.game;
  return typeof game === "object" &&
    game !== null &&
    !Array.isArray(game) &&
    "type" in game &&
    game.type === "rotation";
}

export function serializeAssessmentResponse(
  question: AssessmentResponseQuestion,
  response: unknown,
): unknown {
  return isRotationQuestion(question) &&
      typeof response === "number" &&
      Number.isInteger(response) &&
      response >= 0 &&
      response <= 3
    ? String(response)
    : response;
}

export function restoreAssessmentResponse(
  question: AssessmentResponseQuestion,
  response: unknown,
): unknown {
  return isRotationQuestion(question) &&
      typeof response === "string" &&
      /^[0-3]$/.test(response)
    ? Number(response)
    : response;
}

export function createAssessmentItemResult({
  attemptId,
  question,
  response,
  isCorrect,
  scoringExplanation,
  questionSetVersion,
  scoringRuleVersion,
  includeScoringType = true,
  pointsPerCorrect = 1,
}: {
  attemptId: string;
  question: AssessmentItemResultQuestion;
  response: unknown;
  isCorrect: boolean;
  scoringExplanation: string;
  questionSetVersion: string;
  scoringRuleVersion: string;
  includeScoringType?: boolean;
  pointsPerCorrect?: number;
}) {
  const isBehavioral = question.scoringType === "behavioral";
  const keyResponse = isBehavioral
    ? null
    : typeof question.key === "number"
      ? String(question.key)
      : question.key;

  return {
    attempt_id: attemptId,
    question_id: question.id,
    round_number: question.round,
    question_format: question.format,
    question_snapshot: {
      roundTitle: question.roundTitle,
      ...(question.competency ? { competency: question.competency } : {}),
      ...(question.questionType ? { questionType: question.questionType } : {}),
      ...(question.difficulty ? { difficulty: question.difficulty } : {}),
      prompt: question.text,
      options: question.options ?? null,
      visual: question.visual ?? null,
      game: question.game ?? null,
      scoringType: question.scoringType,
    },
    candidate_response: serializeAssessmentResponse(question, response),
    ...(includeScoringType ? { scoring_type: question.scoringType } : {}),
    key_response: keyResponse,
    is_correct: isBehavioral ? null : isCorrect,
    points: isBehavioral ? null : isCorrect ? pointsPerCorrect : 0,
    scoring_explanation: scoringExplanation,
    question_set_version: questionSetVersion,
    scoring_rule_version: scoringRuleVersion,
  };
}
