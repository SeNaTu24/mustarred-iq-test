import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: authData, error: authError } =
      await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return Response.json({ error: "Your session is invalid or expired." }, { status: 401 });
    }

    if (!authData.user.email_confirmed_at) {
      return Response.json(
        { error: "Verify your email before completing registration." },
        { status: 403 },
      );
    }

    const { data: existingCandidate, error: existingCandidateError } =
      await supabase
        .from("candidates")
        .select("id")
        .eq("id", authData.user.id)
        .maybeSingle();
    if (existingCandidateError) {
      console.error(
        "Candidate profile lookup failed:",
        existingCandidateError.code ?? "unknown",
      );
      return Response.json(
        { error: "We couldn’t complete your registration. Please try again." },
        { status: 500 },
      );
    }
    if (existingCandidate) {
      return Response.json({ registered: true });
    }

    let requestBody: unknown = {};
    try {
      requestBody = await request.json();
    } catch {
      // Profile name may already be present in verified Auth metadata.
    }
    const submittedName =
      typeof requestBody === "object" &&
      requestBody !== null &&
      "fullName" in requestBody &&
      typeof requestBody.fullName === "string"
        ? requestBody.fullName.trim()
        : "";
    const authMetadataName =
      typeof authData.user.user_metadata?.full_name === "string"
        ? authData.user.user_metadata.full_name.trim()
        : "";
    const fullName =
      authMetadataName.length >= 1 && authMetadataName.length <= 120
        ? authMetadataName
        : submittedName;
    if (fullName.length < 1 || fullName.length > 120) {
      return Response.json(
        {
          error: "Enter your full name to finish candidate registration.",
          code: "candidate_name_required",
        },
        { status: 422 },
      );
    }

    const { error: insertError } = await supabase.from("candidates").insert({
      id: authData.user.id,
      full_name: fullName,
    });

    if (insertError?.code === "23505") {
      const { data: existingCandidate, error: lookupError } = await supabase
        .from("candidates")
        .select("id")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (!lookupError && existingCandidate) {
        return Response.json({ registered: true });
      }
      if (lookupError) {
        console.error(
          "Candidate profile retry lookup failed:",
          lookupError.code ?? "unknown",
        );
        return Response.json(
          { error: "We couldn’t complete your registration. Please try again." },
          { status: 500 },
        );
      }
    }

    if (insertError) {
      console.error(
        "Candidate profile creation failed:",
        insertError.code ?? "unknown",
      );
      return Response.json(
        { error: "We couldn’t complete your registration. Please try again." },
        { status: 500 },
      );
    }

    return Response.json({ registered: true }, { status: 201 });
  } catch (error) {
    console.error(
      "Candidate profile request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "We couldn’t complete your registration. Please try again." },
      { status: 500 },
    );
  }
}
