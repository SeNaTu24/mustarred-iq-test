export const ASSESSMENT_SECURITY_EVENT_TYPES = [
  "tab_hidden",
  "tab_visible",
  "window_blur",
  "window_focus",
] as const;

export type AssessmentSecurityEventType =
  (typeof ASSESSMENT_SECURITY_EVENT_TYPES)[number];

export type SecurityEventAttempt = {
  id: string;
  candidate_id: string;
  status: string;
  deadline_at: string;
};

export function isAssessmentSecurityEventType(
  value: unknown,
): value is AssessmentSecurityEventType {
  return ASSESSMENT_SECURITY_EVENT_TYPES.some((eventType) => eventType === value);
}

export async function recordActiveAssessmentSecurityEvent(
  candidateId: string,
  attempt: SecurityEventAttempt | null,
  eventType: unknown,
  persist: (
    attemptId: string,
    candidateId: string,
    eventType: AssessmentSecurityEventType,
  ) => Promise<string | null>,
  now = Date.now(),
): Promise<
  | { kind: "invalid_event" }
  | { kind: "attempt_not_found" }
  | { kind: "attempt_inactive" }
  | { kind: "recorded"; eventId: string }
> {
  if (!isAssessmentSecurityEventType(eventType)) {
    return { kind: "invalid_event" };
  }
  if (!attempt || attempt.candidate_id !== candidateId) {
    return { kind: "attempt_not_found" };
  }
  const deadline = Date.parse(attempt.deadline_at);
  if (
    attempt.status !== "in_progress" ||
    !Number.isFinite(deadline) ||
    now >= deadline
  ) {
    return { kind: "attempt_inactive" };
  }

  const eventId = await persist(attempt.id, candidateId, eventType);
  return eventId
    ? { kind: "recorded", eventId }
    : { kind: "attempt_inactive" };
}
