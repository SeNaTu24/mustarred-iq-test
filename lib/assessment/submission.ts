export type AttemptStatus = "in_progress" | "submitted" | "expired";

export async function finalizeAndGetResult<T>(
  initialStatus: AttemptStatus,
  finalizeOrGet: () => Promise<AttemptStatus>,
  getResult: () => Promise<T>,
): Promise<{ status: Exclude<AttemptStatus, "in_progress">; result: T }> {
  let status = initialStatus;
  if (status === "in_progress") {
    status = await finalizeOrGet();
  }
  if (status !== "submitted" && status !== "expired") {
    throw new Error("Assessment attempt could not be confirmed as finalized.");
  }
  return { status, result: await getResult() };
}
