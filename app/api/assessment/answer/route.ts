import {
  authenticateCandidate,
  calculateAndSaveResult,
  getOwnedAttempt,
} from "@/lib/assessment/server";
import { getQuestionSetForAttempt } from "@/lib/assessment/attempt-question-set";
import { serializeAssessmentResponse } from "@/lib/assessment/item-result";

export async function PUT(request: Request) {
  const auth = await authenticateCandidate(request);
  if (auth.error) return auth.error;

  let body: { questionId?: unknown; response?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid answer request." }, { status: 400 });
  }

  if (typeof body.questionId !== "string") {
    return Response.json({ error: "A question ID is required." }, { status: 400 });
  }

  let questionNumber = 0;
  let questionLabel = "Your answer";
  try {
    const { supabase, attempt } = await getOwnedAttempt(auth.user.id);
    if (!attempt) {
      return Response.json({ error: "No assessment attempt was found for your account." }, { status: 404 });
    }
    const questionSet = await getQuestionSetForAttempt(attempt);
    if (!questionSet) {
      return Response.json({ error: "This attempt uses an unsupported assessment version." }, { status: 409 });
    }
    questionSet.validate();
    const question = questionSet.getQuestion(body.questionId);
    questionNumber = questionSet.questions.findIndex(
      (candidate) => candidate.id === body.questionId,
    ) + 1;
    if (!question || questionNumber === 0) {
      return Response.json(
        { error: "This question is not part of your assessment." },
        { status: 400 },
      );
    }
    questionLabel = `Question ${questionNumber}`;
    const validationError = questionSet.validateResponse(question.id, body.response);
    if (validationError) {
      return Response.json(
        {
          error: `${questionLabel}: ${validationError} Your answer has not been saved.`,
          questionNumber,
        },
        { status: 400 },
      );
    }

    if (attempt.status !== "in_progress") {
      return Response.json({ error: "This attempt is closed and can no longer accept answers." }, { status: 409 });
    }

    const { data: savedAt, error } = await supabase.rpc(
      "record_assessment_answer",
      {
        requested_attempt_id: attempt.id,
        requested_question_id: question.id,
        requested_response: serializeAssessmentResponse(question, body.response),
      },
    );
    if (error) {
      if (error.code === "P0001") {
        const { data: deadlineStatus, error: deadlineError } = await supabase.rpc(
          "expire_assessment_attempt_if_due",
          { requested_attempt_id: attempt.id },
        );
        if (deadlineError) {
          throw new Error("Assessment deadline could not be confirmed.");
        }
        if (deadlineStatus === "submitted") {
          return Response.json(
            { error: "This attempt is closed and can no longer accept answers." },
            { status: 409 },
          );
        }
        if (deadlineStatus !== "expired") {
          return Response.json(
            { error: "This attempt is not accepting answers." },
            { status: 409 },
          );
        }
        const result = await calculateAndSaveResult(supabase, attempt.id);
        return Response.json({ error: "Time is up. Your saved answers have been scored.", result }, { status: 410 });
      }
      console.error("Answer persistence failed:", error.code ?? "unknown");
      return Response.json(
        {
          error: `${questionLabel} could not be saved. Your answer remains on this page; please retry.`,
          questionNumber,
        },
        { status: 500 },
      );
    }

    return Response.json({ savedAt, questionNumber });
  } catch (error) {
    console.error(
      `${questionLabel} answer request failed:`,
      error instanceof Error ? error.name : "Unknown error",
    );
    return Response.json(
      {
        error: questionNumber > 0
          ? `${questionLabel} could not be saved. Your answer remains on this page; please retry.`
          : "Your answer could not be saved. It remains on this page; please retry.",
        ...(questionNumber > 0 ? { questionNumber } : {}),
      },
      { status: 500 },
    );
  }
}
