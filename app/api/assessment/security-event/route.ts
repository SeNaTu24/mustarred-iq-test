import {
  authenticateCandidate,
  getOwnedAttempt,
} from "@/lib/assessment/server";
import {
  isAssessmentSecurityEventType,
  recordActiveAssessmentSecurityEvent,
} from "@/lib/assessment/security-events";

export async function POST(request: Request) {
  const auth = await authenticateCandidate(request);
  if (auth.error) return auth.error;

  let body: { eventType?: unknown };
  try {
    const parsed: unknown = await request.json();
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return Response.json({ error: "Invalid security event request." }, { status: 400 });
    }
    body = {
      eventType:
        "eventType" in parsed ? parsed.eventType : undefined,
    };
  } catch {
    return Response.json({ error: "Invalid security event request." }, { status: 400 });
  }
  if (!isAssessmentSecurityEventType(body.eventType)) {
    return Response.json({ error: "Unsupported security event type." }, { status: 400 });
  }

  try {
    const { supabase, attempt } = await getOwnedAttempt(auth.user.id);
    const outcome = await recordActiveAssessmentSecurityEvent(
      auth.user.id,
      attempt,
      body.eventType,
      async (attemptId, candidateId, eventType) => {
        const { data, error } = await supabase.rpc(
          "record_assessment_security_event",
          {
            requested_attempt_id: attemptId,
            requested_candidate_id: candidateId,
            requested_event_type: eventType,
          },
        );
        if (error) {
          if (error.code === "P0002" || error.code === "23514") return null;
          throw new Error(`Security event persistence failed: ${error.message}`);
        }
        if (typeof data !== "string") {
          throw new Error("Security event persistence returned an unexpected result.");
        }
        return data;
      },
    );

    if (outcome.kind === "invalid_event") {
      return Response.json({ error: "Unsupported security event type." }, { status: 400 });
    }
    if (outcome.kind === "attempt_not_found") {
      return Response.json({ error: "No owned assessment attempt was found." }, { status: 404 });
    }
    if (outcome.kind === "attempt_inactive") {
      return Response.json({ error: "This assessment attempt is no longer active." }, { status: 409 });
    }
    return Response.json({ recorded: true }, { status: 201 });
  } catch (error) {
    console.error(
      "Assessment security event request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "The assessment activity event could not be recorded." },
      { status: 500 },
    );
  }
}
