import "server-only";

import {
  DEMO_QUESTION_SET_VERSION as CURRENT_VERSION,
  DEMO_SCORING_RULE_VERSION,
  demoQuestions,
  getDemoResponseValidationError,
  getPublicDemoQuestion,
  scoreAllDemoResponses,
  scoreDemoResponse,
  validateDemoBank,
} from "./demo-question-bank-v3";
import {
  DEMO_QUESTION_SET_VERSION as V2_VERSION,
  DEMO_SCORING_RULE_VERSION as V2_SCORING_RULE_VERSION,
  demoQuestions as v2Questions,
  getDemoResponseValidationError as getV2ValidationError,
  getPublicDemoQuestion as getV2PublicQuestion,
  scoreAllDemoResponses as scoreV2Responses,
  scoreDemoResponse as scoreV2Response,
  validateDemoBank as validateV2Bank,
} from "./demo-question-bank";
import {
  DEMO_QUESTION_SET_VERSION as LEGACY_VERSION,
  demoQuestions as legacyQuestions,
  getDemoResponseValidationError as getLegacyValidationError,
  getPublicDemoQuestion as getLegacyPublicQuestion,
  scoreAllDemoResponses as scoreLegacyResponses,
  scoreDemoResponse as scoreLegacyResponse,
} from "./demo-question-bank-v1";

export type AssessmentQuestion = {
  id: string;
  round: number;
  roundTitle: string;
  format: string;
  scoringType: "objective" | "behavioral";
  text: string;
  options?: Array<{ id: string; label: string }>;
  visual?: unknown;
  game?: unknown;
  key?: unknown;
  rationale?: string;
};

export type AssessmentScore = {
  totalCorrect: number;
  percentage: number;
  outcome: "PASS" | "FAIL";
  rounds: Array<{ round: number; correct: number; percentage?: number }>;
};

export type AssessmentQuestionSet = {
  version: string;
  label: string;
  scoringRuleVersion: string;
  questions: AssessmentQuestion[];
  publicQuestions: unknown[];
  getQuestion(questionId: string): AssessmentQuestion | undefined;
  validateResponse(questionId: string, response: unknown): string | null;
  scoreResponse(questionId: string, response: unknown): boolean;
  scoreResponses(responses: Map<string, unknown>): AssessmentScore;
  validate(): void;
  explanation(questionId: string): string;
};

const currentQuestionById = new Map(demoQuestions.map((question) => [question.id, question]));
const v2QuestionById = new Map(v2Questions.map((question) => [question.id, question]));
const legacyQuestionById = new Map(legacyQuestions.map((question) => [question.id, question]));

const currentSet: AssessmentQuestionSet = {
  version: CURRENT_VERSION,
  label: "Mustarred assessment",
  scoringRuleVersion: DEMO_SCORING_RULE_VERSION,
  questions: demoQuestions,
  publicQuestions: demoQuestions.map(getPublicDemoQuestion),
  getQuestion: (questionId) => currentQuestionById.get(questionId),
  validateResponse: (questionId, response) => {
    const question = currentQuestionById.get(questionId);
    return question ? getDemoResponseValidationError(question, response) : null;
  },
  scoreResponse: (questionId, response) => {
    const question = currentQuestionById.get(questionId);
    return question ? scoreDemoResponse(question, response) : false;
  },
  scoreResponses: (responses) => scoreAllDemoResponses(responses),
  validate: validateDemoBank,
  explanation: (questionId) =>
    currentQuestionById.get(questionId)?.rationale ??
    "One point is awarded for the keyed objective response.",
};

const v2Set: AssessmentQuestionSet = {
  version: V2_VERSION,
  label: "Previous 55-item assessment version",
  scoringRuleVersion: V2_SCORING_RULE_VERSION,
  questions: v2Questions,
  publicQuestions: v2Questions.map(getV2PublicQuestion),
  getQuestion: (questionId) => v2QuestionById.get(questionId),
  validateResponse: (questionId, response) => {
    const question = v2QuestionById.get(questionId);
    return question ? getV2ValidationError(question, response) : null;
  },
  scoreResponse: (questionId, response) => {
    const question = v2QuestionById.get(questionId);
    return question ? scoreV2Response(question, response) : false;
  },
  scoreResponses: (responses) => scoreV2Responses(responses),
  validate: validateV2Bank,
  explanation: (questionId) =>
    v2QuestionById.get(questionId)?.rationale ??
    "One point is awarded for the keyed objective response.",
};

const legacySet: AssessmentQuestionSet = {
  version: LEGACY_VERSION,
  label: "Previous assessment version",
  scoringRuleVersion: "mustarred-demo-scoring-v1",
  questions: legacyQuestions.map((question) => ({
    ...question,
    scoringType: "objective" as const,
  })),
  publicQuestions: legacyQuestions.map(getLegacyPublicQuestion),
  getQuestion: (questionId) => {
    const question = legacyQuestionById.get(questionId);
    return question ? { ...question, scoringType: "objective" } : undefined;
  },
  validateResponse: (questionId, response) => {
    const question = legacyQuestionById.get(questionId);
    return question ? getLegacyValidationError(question, response) : null;
  },
  scoreResponse: (questionId, response) => {
    const question = legacyQuestionById.get(questionId);
    return question ? scoreLegacyResponse(question, response) : false;
  },
  scoreResponses: (responses) => scoreLegacyResponses(responses),
  validate: () => {
    const roundsValid = [1, 2, 3, 4, 5].every(
      (round) => legacyQuestions.filter((question) => question.round === round).length === 10,
    );
    if (
      legacyQuestions.length !== 50 ||
      new Set(legacyQuestions.map((question) => question.id)).size !== 50 ||
      !roundsValid
    ) {
      throw new Error("Previous assessment question set failed its structural checks.");
    }
  },
  explanation: () =>
    "One point is awarded for the exact objective answer or the original scenario/game scoring rule; zero otherwise.",
};

export function getAssessmentQuestionSet(version: string): AssessmentQuestionSet | null {
  if (version === CURRENT_VERSION) return currentSet;
  if (version === V2_VERSION) return v2Set;
  if (version === LEGACY_VERSION) return legacySet;
  return null;
}
