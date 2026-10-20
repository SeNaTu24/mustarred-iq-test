export const RCAP_QUESTION_SET_VERSION = "mustarred-rcap-200-v1";
export const RCAP_SCORING_RULE_VERSION = "mustarred-rcap-80pct-v1";
export const RCAP_QUESTION_COUNT = 30;
export const RCAP_QUESTIONS_PER_COMPETENCY = 6;
export const RCAP_DURATION_SECONDS = 720;
export const RCAP_PASS_PERCENT = 80;
export const RCAP_POINTS_PER_CORRECT = 4;

export const RCAP_COMPETENCIES = [
  "Commercial Awareness",
  "Risk Awareness & Judgement",
  "Creativity, Problem Solving & Adaptability",
  "Personality, Drive & Execution",
  "Emotional Intelligence & Professional Maturity",
] as const;

export type RcapCompetency = (typeof RCAP_COMPETENCIES)[number];
export type RcapQuestionType = "Abstract" | "Practical";
export type RcapDifficulty = "Hard" | "Exceptionally hard";
export type RcapOptionId = "a" | "b" | "c" | "d";
