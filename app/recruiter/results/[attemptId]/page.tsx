import type { Metadata } from "next";
import { Suspense } from "react";
import { RecruiterAttemptDetail } from "./recruiter-attempt-detail";

export const metadata: Metadata = {
  title: "Recruiter attempt detail | Mustarred",
  description: "Restricted demo attempt and item scoring details.",
};

export default function RecruiterAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  return (
    <Suspense fallback={<main className="recruiter-page"><p role="status">Loading attempt details…</p></main>}>
      <ResolvedRecruiterAttemptPage params={params} />
    </Suspense>
  );
}

async function ResolvedRecruiterAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <RecruiterAttemptDetail attemptId={attemptId} />;
}
