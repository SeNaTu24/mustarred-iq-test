import type { Metadata } from "next";
import { AssessmentClient } from "./assessment-client";

export const metadata: Metadata = {
  title: "Assessment | Mustarred",
  description: "Complete the Mustarred talent assessment.",
};

export default function AssessmentPage() {
  return <AssessmentClient />;
}
