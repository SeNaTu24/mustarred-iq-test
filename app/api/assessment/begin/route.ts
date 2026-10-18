import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  DEMO_QUESTION_SET_VERSION,
  validateDemoBank,
} from "@/lib/assessment/demo-question-bank-v3";

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return Response.json({ error: "Sign in and verify your email before beginning." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: authData, error: authError } =
      await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return Response.json(
        { error: "Your session is invalid or expired. Sign in again." },
        { status: 401 },
      );
    }

    if (!authData.user.email_confirmed_at) {
      return Response.json(
        { error: "Verify your email before beginning." },
        { status: 403 },
      );
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (candidateError) {
      console.error("Candidate lookup failed:", candidateError.message);
      return Response.json(
        { error: "We couldn’t verify your registration. Please sign in again." },
        { status: 500 },
      );
    }

    if (!candidate) {
      return Response.json(
        { error: "Complete your registration before beginning the assessment." },
        { status: 403 },
      );
    }
    validateDemoBank();

    const { data: attemptId, error: beginError } = await supabase.rpc(
      "begin_assessment_attempt",
      {
        requested_candidate_id: authData.user.id,
        requested_question_set_version: DEMO_QUESTION_SET_VERSION,
      },
    );

    if (beginError?.code === "23505") {
      const { data: existingAttempt, error: lookupError } = await supabase
        .from("assessment_attempts")
        .select("id, status, started_at, deadline_at, question_set_version")
        .eq("candidate_id", authData.user.id)
        .maybeSingle();

      if (!lookupError && existingAttempt) {
        return Response.json({
          alreadyStarted: true,
          attempt: existingAttempt,
        });
      }
    }

    if (beginError || typeof attemptId !== "string") {
      console.error(
        "Assessment attempt creation failed:",
        beginError?.message ?? "Unexpected RPC result",
      );
      return Response.json(
        { error: "We couldn’t start your assessment. Please try again." },
        { status: 500 },
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("assessment_attempts")
      .select("id, status, started_at, deadline_at, question_set_version")
      .eq("id", attemptId)
      .eq("candidate_id", authData.user.id)
      .single();

    if (attemptError || !attempt) {
      console.error(
        "Started attempt lookup failed:",
        attemptError?.message ?? "Attempt record missing",
      );
      return Response.json(
        { error: "Your assessment started, but we couldn’t confirm its status. Please reload the page." },
        { status: 500 },
      );
    }

    return Response.json({ alreadyStarted: false, attempt }, { status: 201 });
  } catch (error) {
    console.error(
      "Assessment begin request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "We couldn’t start your assessment. Please try again." },
      { status: 500 },
    );
  }
}
