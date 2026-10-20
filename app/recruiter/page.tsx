import type { Metadata } from "next";
import { RecruiterResults } from "./recruiter-results";

export const metadata: Metadata = {
  title: "Recruiter RCAP results | Mustarred",
  description: "Restricted candidate RCAP assessment results.",
};

export default function RecruiterResultsPage() {
  return <RecruiterResults />;
}
