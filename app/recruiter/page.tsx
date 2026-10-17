import type { Metadata } from "next";
import { RecruiterResults } from "./recruiter-results";

export const metadata: Metadata = {
  title: "Recruiter demo results | Mustarred",
  description: "Restricted demo candidate assessment results.",
};

export default function RecruiterResultsPage() {
  return <RecruiterResults />;
}
