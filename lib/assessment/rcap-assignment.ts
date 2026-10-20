import { createHash } from "node:crypto";
import type { AssessmentQuestionSet } from "./question-sets";
import {
  RCAP_COMPETENCIES,
  RCAP_PASS_PERCENT,
  RCAP_POINTS_PER_CORRECT,
  RCAP_QUESTION_COUNT,
  RCAP_QUESTION_SET_VERSION,
  RCAP_QUESTIONS_PER_COMPETENCY,
  RCAP_SCORING_RULE_VERSION,
} from "./rcap-constants";
import type {
  RcapCompetency,
  RcapDifficulty,
  RcapOptionId,
  RcapQuestionType,
} from "./rcap-constants";

export * from "./rcap-constants";

export type RcapQuestion = {
  id: string;
  competency: RcapCompetency;
  questionType: RcapQuestionType;
  difficulty: RcapDifficulty;
  patternFamily: string;
  text: string;
  options: Record<RcapOptionId, string>;
  key: RcapOptionId;
  explanation: string;
};

export type RcapAssignment = {
  questionIds: string[];
  optionOrders: Record<string, RcapOptionId[]>;
};

const HEADERS = [
  "ID",
  "Competency",
  "Question Type",
  "Difficulty",
  "Pattern Family",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Letter",
  "Correct Value",
  "Explanation",
] as const;

function cellText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object" && value !== null) {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if (
      "richText" in value &&
      Array.isArray(value.richText) &&
      value.richText.every(
        (part) => typeof part === "object" && part !== null && "text" in part,
      )
    ) {
      return value.richText.map((part) => String(part.text)).join("").trim();
    }
  }
  return "";
}

type RandomIndex = (maxExclusive: number) => number;

class InvalidRcapAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRcapAssignmentError";
  }
}

function shuffle<T>(items: readonly T[], randomIndex: RandomIndex): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = pickRandomIndex(index + 1, randomIndex);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function parseRcapQuestionRows(
  headers: readonly unknown[],
  rows: readonly (readonly unknown[])[],
): RcapQuestion[] {
  const indexByHeader = new Map(
    headers.map((header, index) => [cellText(header).toLocaleLowerCase(), index]),
  );
  for (const header of HEADERS) {
    if (!indexByHeader.has(header.toLocaleLowerCase())) {
      throw new Error("The RCAP bank is missing a required column.");
    }
  }

  const read = (row: readonly unknown[], header: string) =>
    cellText(row[indexByHeader.get(header.toLocaleLowerCase())!]);

  const questions = rows
    .filter((row) => read(row, "ID").length > 0)
    .map((row): RcapQuestion => {
      const id = read(row, "ID");
      const competency = read(row, "Competency") as RcapCompetency;
      const questionType = read(row, "Question Type") as RcapQuestionType;
      const difficulty = read(row, "Difficulty") as RcapDifficulty;
      const key = read(row, "Correct Letter").toLocaleLowerCase() as RcapOptionId;
      const options: Record<RcapOptionId, string> = {
        a: read(row, "Option A"),
        b: read(row, "Option B"),
        c: read(row, "Option C"),
        d: read(row, "Option D"),
      };
      const correctValue = read(row, "Correct Value");
      const explanation = read(row, "Explanation");

      if (
        !id ||
        !RCAP_COMPETENCIES.includes(competency) ||
        (questionType !== "Abstract" && questionType !== "Practical") ||
        (difficulty !== "Hard" && difficulty !== "Exceptionally hard") ||
        !/^[a-d]$/.test(key) ||
        Object.values(options).some((option) => !option) ||
        options[key] !== correctValue ||
        !read(row, "Question") ||
        !read(row, "Pattern Family") ||
        !explanation ||
        Array.from(explanation).length > 1000
      ) {
        throw new Error("The RCAP bank contains an invalid question record.");
      }

      return {
        id,
        competency,
        questionType,
        difficulty,
        patternFamily: read(row, "Pattern Family"),
        text: read(row, "Question"),
        options,
        key,
        explanation,
      };
    });

  validateRcapBank(questions);
  return questions;
}

export function validateRcapBank(questions: readonly RcapQuestion[]): void {
  const ids = new Set(questions.map(({ id }) => id));
  if (questions.length !== 200 || ids.size !== 200) {
    throw new Error("The RCAP bank must contain 200 unique questions.");
  }

  for (const competency of RCAP_COMPETENCIES) {
    const categoryQuestions = questions.filter(
      (question) => question.competency === competency,
    );
    const families = new Map<string, RcapQuestion[]>();
    for (const question of categoryQuestions) {
      const family = families.get(question.patternFamily) ?? [];
      family.push(question);
      families.set(question.patternFamily, family);
    }
    if (
      categoryQuestions.length !== 40 ||
      families.size !== 10 ||
      [...families.values()].some((family) => family.length !== 4)
    ) {
      throw new Error("Each RCAP competency must have 40 questions across 10 four-item families.");
    }
  }
}

export function fingerprintRcapQuestionSet(questionIds: readonly string[]): string {
  return createHash("sha256")
    .update([...questionIds].sort().join("\n"))
    .digest("hex");
}

export type RcapReservation<T> =
  | { kind: "created"; value: T }
  | { kind: "existing"; value: T }
  | { kind: "duplicate" };

export async function allocateUniqueRcapAssignment<T>(
  questions: readonly RcapQuestion[],
  reserve: (
    assignment: RcapAssignment,
    fingerprint: string,
  ) => Promise<RcapReservation<T>>,
  randomIndex: RandomIndex = (maxExclusive) =>
    Math.floor(Math.random() * maxExclusive),
  maxAttempts = 40,
): Promise<{ assignment: RcapAssignment; fingerprint: string; value: T; alreadyStarted: boolean }> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const assignment = selectRcapAssignment(questions, randomIndex);
      const fingerprint = fingerprintRcapQuestionSet(assignment.questionIds);
      const reservation = await reserve(assignment, fingerprint);
      if (reservation.kind === "duplicate") continue;
      return {
        assignment,
        fingerprint,
        value: reservation.value,
        alreadyStarted: reservation.kind === "existing",
      };
    } catch (error) {
      if (error instanceof InvalidRcapAssignmentError) continue;
      throw error;
    }
  }
  throw new Error("A unique RCAP question set could not be reserved.");
}

function pickRandomIndex(
  maxExclusive: number,
  randomIndex: (maxExclusive: number) => number,
): number {
  const index = randomIndex(maxExclusive);
  if (!Number.isInteger(index) || index < 0 || index >= maxExclusive) {
    throw new Error("The random source returned an invalid index.");
  }
  return index;
}

export function selectRcapAssignment(
  questions: readonly RcapQuestion[],
  randomIndex: RandomIndex = (maxExclusive) =>
    Math.floor(Math.random() * maxExclusive),
): RcapAssignment {
  validateRcapBank(questions);
  const selectedByCompetency = new Map<RcapCompetency, RcapQuestion[]>();
  const threeAbstractCompetencies = new Set(
    shuffle(RCAP_COMPETENCIES, randomIndex).slice(0, 2),
  );

  for (const competency of RCAP_COMPETENCIES) {
    const families = new Map<string, RcapQuestion[]>();
    for (const question of questions) {
      if (question.competency !== competency) continue;
      const family = families.get(question.patternFamily) ?? [];
      family.push(question);
      families.set(question.patternFamily, family);
    }

    const abstractQuota = threeAbstractCompetencies.has(competency) ? 3 : 4;
    const practicalQuota = RCAP_QUESTIONS_PER_COMPETENCY - abstractQuota;
    const abstractFamilies = shuffle(
      [...families].filter(([, variants]) => variants[0].questionType === "Abstract"),
      randomIndex,
    ).slice(0, abstractQuota);
    const practicalFamilies = shuffle(
      [...families].filter(([, variants]) => variants[0].questionType === "Practical"),
      randomIndex,
    ).slice(0, practicalQuota);
    const selectedFamilies = [...abstractFamilies, ...practicalFamilies];
    selectedByCompetency.set(
      competency,
      selectedFamilies.map(([, variants]) => variants[0]),
    );
  }

  const extraHardCompetency = RCAP_COMPETENCIES[
    pickRandomIndex(RCAP_COMPETENCIES.length, randomIndex)
  ];
  const assigned: RcapQuestion[] = [];
  for (const competency of RCAP_COMPETENCIES) {
    const familyRepresentatives = selectedByCompetency.get(competency)!;
    const hardCandidates = shuffle(
      familyRepresentatives.filter((representative) =>
        questions.some((variant) =>
          variant.competency === competency &&
          variant.patternFamily === representative.patternFamily &&
          variant.difficulty === "Hard",
        ),
      ),
      randomIndex,
    );
    const hardCount = competency === extraHardCompetency ? 2 : 1;
    const hardFamilies = new Set(
      hardCandidates.slice(0, hardCount).map(({ patternFamily }) => patternFamily),
    );

    for (const representative of familyRepresentatives) {
      const desiredDifficulty = hardFamilies.has(representative.patternFamily)
        ? "Hard"
        : "Exceptionally hard";
      const variants = questions.filter(
        (question) =>
          question.competency === competency &&
          question.patternFamily === representative.patternFamily &&
          question.difficulty === desiredDifficulty,
      );
      if (variants.length === 0) {
        throw new InvalidRcapAssignmentError(
          "The RCAP bank cannot satisfy the assignment balance.",
        );
      }
      assigned.push(variants[pickRandomIndex(variants.length, randomIndex)]);
    }
  }

  const orderedQuestions = shuffle(assigned, randomIndex);
  validateAssignedQuestions(orderedQuestions);
  const optionOrders = Object.fromEntries(
    orderedQuestions.map((question) => [
      question.id,
      shuffle(["a", "b", "c", "d"] as const, randomIndex),
    ]),
  );

  return {
    questionIds: orderedQuestions.map(({ id }) => id),
    optionOrders,
  };
}

function validateAssignedQuestions(questions: readonly RcapQuestion[]): void {
  if (
    questions.length !== RCAP_QUESTION_COUNT ||
    new Set(questions.map(({ id }) => id)).size !== RCAP_QUESTION_COUNT
  ) {
    throw new Error("The RCAP attempt must contain exactly 30 unique questions.");
  }
  let abstractCount = 0;
  let practicalCount = 0;
  let hardCount = 0;
  for (const competency of RCAP_COMPETENCIES) {
    const categoryQuestions = questions.filter((question) => question.competency === competency);
    if (
      categoryQuestions.length !== RCAP_QUESTIONS_PER_COMPETENCY ||
      new Set(categoryQuestions.map((question) => question.patternFamily)).size !==
        RCAP_QUESTIONS_PER_COMPETENCY ||
      !categoryQuestions.some((question) => question.questionType === "Abstract") ||
      !categoryQuestions.some((question) => question.questionType === "Practical")
    ) {
      throw new InvalidRcapAssignmentError(
        "The RCAP attempt must contain six distinct families per competency.",
      );
    }
    abstractCount += categoryQuestions.filter((question) => question.questionType === "Abstract").length;
    practicalCount += categoryQuestions.filter((question) => question.questionType === "Practical").length;
    hardCount += categoryQuestions.filter((question) => question.difficulty === "Hard").length;
  }
  if (abstractCount !== 18 || practicalCount !== 12 || hardCount !== 6) {
    throw new InvalidRcapAssignmentError(
      "The RCAP attempt has an invalid question-type or difficulty balance.",
    );
  }
}

export function createRcapQuestionSet(
  bank: readonly RcapQuestion[],
  assignment: RcapAssignment,
): AssessmentQuestionSet {
  if (
    assignment.questionIds.length !== RCAP_QUESTION_COUNT ||
    Object.keys(assignment.optionOrders).length !== RCAP_QUESTION_COUNT
  ) {
    throw new Error("The RCAP assignment is incomplete.");
  }
  const questionById = new Map(bank.map((question) => [question.id, question]));
  const questions = assignment.questionIds.map((questionId) => {
    const source = questionById.get(questionId);
    const optionOrder = assignment.optionOrders[questionId];
    if (
      !source ||
      !Array.isArray(optionOrder) ||
      optionOrder.length !== 4 ||
      new Set(optionOrder).size !== 4 ||
      optionOrder.some((id) => !["a", "b", "c", "d"].includes(id))
    ) {
      throw new Error("The RCAP attempt assignment is invalid.");
    }

    return {
      id: source.id,
      round: RCAP_COMPETENCIES.indexOf(source.competency) + 1,
      roundTitle: source.competency,
      format: "normal",
      scoringType: "objective" as const,
      competency: source.competency,
      questionType: source.questionType,
      difficulty: source.difficulty,
      text: source.text,
      options: optionOrder.map((id) => ({ id, label: source.options[id] })),
      key: source.key,
      rationale: source.explanation,
    };
  });

  const questionByAssignedId = new Map(questions.map((question) => [question.id, question]));
  const validate = () =>
    validateAssignedQuestions(
      assignment.questionIds.map((questionId) => questionById.get(questionId)!).filter(Boolean),
    );
  validate();

  return {
    version: RCAP_QUESTION_SET_VERSION,
    label: "RCAP assessment",
    scoringRuleVersion: RCAP_SCORING_RULE_VERSION,
    questions,
    publicQuestions: questions.map((question) => ({
      id: question.id,
      round: question.round,
      roundTitle: question.roundTitle,
      format: question.format,
      responseType: "objective",
      text: question.text,
      options: question.options,
    })),
    getQuestion: (questionId) => questionByAssignedId.get(questionId),
    validateResponse: (questionId, response) => {
      const question = questionByAssignedId.get(questionId);
      return question && typeof response === "string" &&
        question.options?.some((option) => option.id === response)
        ? null
        : "Select one of the listed responses.";
    },
    scoreResponse: (questionId, response) =>
      questionByAssignedId.get(questionId)?.key === response,
    scoreResponses: (responses) => {
      const rounds = RCAP_COMPETENCIES.map((_, index) => {
        const round = index + 1;
        const categoryQuestions = questions.filter((question) => question.round === round);
        const correct = categoryQuestions.reduce(
          (total, question) =>
            total + (questionByAssignedId.get(question.id)?.key === responses.get(question.id) ? 1 : 0),
          0,
        );
        return {
          round,
          correct,
          percentage: Number(((correct / RCAP_QUESTIONS_PER_COMPETENCY) * 100).toFixed(2)),
        };
      });
      const totalCorrect = rounds.reduce((total, round) => total + round.correct, 0);
      return {
        totalCorrect,
        maxCorrect: RCAP_QUESTION_COUNT,
        marksEarned: totalCorrect * RCAP_POINTS_PER_CORRECT,
        marksPossible: RCAP_QUESTION_COUNT * RCAP_POINTS_PER_CORRECT,
        percentage: Number(((totalCorrect / RCAP_QUESTION_COUNT) * 100).toFixed(2)),
        outcome: totalCorrect >= Math.ceil(RCAP_QUESTION_COUNT * RCAP_PASS_PERCENT / 100)
          ? "PASS" as const
          : "FAIL" as const,
        rounds,
      };
    },
    validate,
    explanation: (questionId) =>
      questionByAssignedId.get(questionId)?.rationale ??
      "The response did not match the keyed RCAP option.",
  };
}
