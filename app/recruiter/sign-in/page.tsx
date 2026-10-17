import type { Metadata } from "next";
import { RecruiterSignIn } from "./recruiter-sign-in";

export const metadata: Metadata = {
  title: "Recruiter sign in | Mustarred",
  description: "Sign in to review the restricted assessment demo results.",
};

export default function RecruiterSignInPage() {
  return <RecruiterSignIn />;
}
