import "server-only";

import { createRcapQuestionSet, RCAP_QUESTION_SET_VERSION } from "./rcap-assignment";
import { loadRcapQuestionBank } from "./rcap-bank";
import { getAssessmentQuestionSet } from "./question-sets";

export type AttemptQuestionSetSource = {
  question_set_version: string;
  assigned_question_ids?: string[] | null;
  assigned_option_orders?: unknown;
};

export async function getQuestionSetForAttempt(
  attempt: AttemptQuestionSetSource,
) {
  if (attempt.question_set_version !== RCAP_QUESTION_SET_VERSION) {
    return getAssessmentQuestionSet(attempt.question_set_version);
  }

  const questionIds = attempt.assigned_question_ids;
  const optionOrders = attempt.assigned_option_orders;
  if (
    !Array.isArray(questionIds) ||
    questionIds.some((questionId) => typeof questionId !== "string") ||
    typeof optionOrders !== "object" ||
    optionOrders === null ||
    Array.isArray(optionOrders)
  ) {
    throw new Error("The saved RCAP assignment is unavailable or invalid.");
  }

  return createRcapQuestionSet(await loadRcapQuestionBank(), {
    questionIds,
    optionOrders: optionOrders as Record<string, import("./rcap-assignment").RcapOptionId[]>,
  });
}
