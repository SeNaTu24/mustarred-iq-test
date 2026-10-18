import "server-only";

import {
  DEMO_SCORING_RULE_VERSION as V2_SCORING_RULE_VERSION,
  demoQuestions as v2Questions,
  getDemoResponseValidationError as validateV2Response,
  getPublicDemoQuestion as toV2PublicQuestion,
  scoreDemoResponse as scoreV2Response,
  type DemoQuestion,
} from "./demo-question-bank";

export const DEMO_QUESTION_SET_VERSION = "mustarred-assessment-2026-10-v3";
export const DEMO_QUESTION_SET_LABEL = "Mustarred assessment";
export const DEMO_SCORING_RULE_VERSION = `${V2_SCORING_RULE_VERSION}-50`;

type Shape = "circle" | "square" | "triangle" | "diamond";
type Color = "green" | "orange" | "blue" | "purple";
type Tile = NonNullable<NonNullable<DemoQuestion["visual"]>["tiles"][number]>;
type Glyph = Tile["glyphs"][number];

const colors: Record<Color, string> = {
  green: "#214f3c",
  orange: "#c56c42",
  blue: "#527d91",
  purple: "#75618f",
};

function glyph(
  shape: Shape,
  color: Color,
  rotation = 0,
  x = 50,
  y = 50,
  size = 30,
): Glyph {
  return { shape, color: colors[color], rotation, x, y, size };
}

function tile(...glyphs: Glyph[]): Tile {
  return { glyphs };
}

function single(
  shape: Shape,
  color: Color,
  rotation = 0,
  x = 50,
  y = 50,
  size = 30,
) {
  return tile(glyph(shape, color, rotation, x, y, size));
}

function pattern(
  id: string,
  text: string,
  layout: "sequence" | "matrix",
  tiles: Array<Tile | null>,
  choices: Array<[string, Tile]>,
  key: string,
  rationale: string,
): DemoQuestion {
  return {
    id,
    round: 1,
    roundTitle: "Pattern recognition",
    format: "pattern",
    scoringType: "objective",
    text,
    options: choices.map(([id], index) => ({
      id,
      label: `Option ${String.fromCharCode(65 + index)}`,
    })),
    visual: {
      layout,
      tiles,
      choices: choices.map(([id, choiceTile]) => ({ id, tile: choiceTile })),
    },
    key,
    rationale,
  };
}

function cluster(
  count: number,
  color: Color,
  shape: Shape = "circle",
  rotation = 0,
) {
  return tile(
    ...Array.from({ length: count }, (_, index) =>
      glyph(shape, color, rotation, 20 + index * (60 / Math.max(count - 1, 1)), 50, 16),
    ),
  );
}

const patternQuestions: DemoQuestion[] = [
  pattern(
    "PR-01",
    "The triangle alternates between quarter-turn and half-turn clockwise rotations. Select the next figure.",
    "sequence",
    [
      single("triangle", "green", 0),
      single("triangle", "green", 90),
      single("triangle", "green", 270),
      single("triangle", "green", 0),
      null,
    ],
    [
      ["a", single("triangle", "green", 90)],
      ["b", single("triangle", "green", 180)],
      ["c", single("square", "green", 180)],
      ["d", single("triangle", "orange", 180)],
    ],
    "b",
    "The turns repeat as +90 degrees, then +180 degrees. The next turn is +180 degrees from 0.",
  ),
  pattern(
    "PR-02",
    "Two rules operate together: one symbol is added each step, and the color advances green, orange, blue. Select the next tile.",
    "sequence",
    [cluster(1, "green"), cluster(2, "orange"), cluster(3, "blue"), cluster(4, "green"), null],
    [
      ["a", cluster(5, "orange")],
      ["b", cluster(5, "green")],
      ["c", cluster(4, "orange")],
      ["d", tile(glyph("circle", "orange", 0, 20, 50, 16), glyph("circle", "blue", 0, 40, 50, 16), glyph("circle", "green", 0, 60, 50, 16), glyph("circle", "orange", 0, 80, 50, 16), glyph("circle", "blue", 0, 50, 20, 16))],
    ],
    "a",
    "The next tile has five symbols and the color cycle returns to orange.",
  ),
  pattern(
    "PR-03",
    "The shape and color alternate, and the symbol moves clockwise around the four corners. Select the next figure.",
    "sequence",
    [
      single("triangle", "green", 0, 20, 20),
      single("circle", "orange", 0, 80, 20),
      single("triangle", "green", 0, 80, 80),
      single("circle", "orange", 0, 20, 80),
      null,
    ],
    [
      ["a", single("triangle", "green", 0, 20, 20)],
      ["b", single("circle", "orange", 0, 80, 20)],
      ["c", single("triangle", "orange", 0, 20, 20)],
      ["d", single("triangle", "green", 0, 80, 80)],
    ],
    "a",
    "The fifth position returns to the upper-left corner; odd positions are green triangles.",
  ),
  pattern(
    "PR-04",
    "Each step right rotates the triangle 90 degrees clockwise. Each step down changes the color and adds a half-turn. Select the missing tile.",
    "matrix",
    [
      single("triangle", "green", 0),
      single("triangle", "green", 90),
      single("triangle", "orange", 180),
      null,
    ],
    [
      ["a", single("triangle", "orange", 270)],
      ["b", single("triangle", "orange", 90)],
      ["c", single("triangle", "orange", 180)],
      ["d", single("triangle", "blue", 270)],
    ],
    "a",
    "Apply both transformations to reach the lower-right tile: triangle, orange, rotated 270 degrees.",
  ),
  pattern(
    "PR-05",
    "A triangle turns clockwise by an increasing amount each time: 45 degrees, then 90, then 135. Select the next figure.",
    "sequence",
    [
      single("triangle", "purple", 0),
      single("triangle", "purple", 45),
      single("triangle", "purple", 135),
      single("triangle", "purple", 270),
      null,
    ],
    [
      ["a", single("triangle", "purple", 45)],
      ["b", single("triangle", "purple", 90)],
      ["c", single("square", "purple", 90)],
      ["d", single("triangle", "orange", 90)],
    ],
    "b",
    "The next increase is 180 degrees: 270 + 180 wraps to 90 degrees.",
  ),
  pattern(
    "PR-06",
    "In each row, the third tile combines the symbols in the first two tiles. Select the missing tile.",
    "matrix",
    [
      single("circle", "green"),
      single("triangle", "green"),
      tile(glyph("circle", "green", 0, 35, 50, 24), glyph("triangle", "green", 0, 68, 50, 24)),
      single("square", "orange"),
      single("diamond", "orange"),
      null,
    ],
    [
      ["a", tile(glyph("square", "orange", 0, 35, 50, 24), glyph("diamond", "orange", 0, 68, 50, 24))],
      ["b", tile(glyph("square", "orange", 0, 35, 50, 24), glyph("circle", "orange", 0, 68, 50, 24))],
      ["c", tile(glyph("diamond", "orange", 0, 35, 50, 24), glyph("triangle", "orange", 0, 68, 50, 24))],
      ["d", single("square", "orange")],
    ],
    "a",
    "The bottom row combines a square and a diamond, matching the combine rule in the top row.",
  ),
  pattern(
    "PR-07",
    "The triangle rotates 90 degrees clockwise each step, its color alternates green and orange, and it moves clockwise around the corners. Select the next figure.",
    "sequence",
    [
      single("triangle", "green", 0, 20, 20),
      single("triangle", "orange", 90, 80, 20),
      single("triangle", "green", 180, 80, 80),
      single("triangle", "orange", 270, 20, 80),
      null,
    ],
    [
      ["a", single("triangle", "green", 0, 20, 20)],
      ["b", single("triangle", "orange", 0, 80, 20)],
      ["c", single("triangle", "orange", 0, 20, 20)],
      ["d", single("triangle", "green", 270, 20, 20)],
    ],
    "a",
    "The fifth tile returns to the upper-left with a green triangle rotated to 0 degrees.",
  ),
  pattern(
    "PR-08",
    "Across each row the two symbols swap positions. Down each column their shapes change while their positions stay fixed. Select the missing tile.",
    "matrix",
    [
      tile(glyph("circle", "blue", 0, 28, 50, 24), glyph("diamond", "blue", 0, 72, 50, 24)),
      tile(glyph("diamond", "blue", 0, 28, 50, 24), glyph("circle", "blue", 0, 72, 50, 24)),
      tile(glyph("triangle", "orange", 0, 28, 50, 24), glyph("square", "orange", 0, 72, 50, 24)),
      null,
    ],
    [
      ["a", tile(glyph("square", "orange", 0, 28, 50, 24), glyph("triangle", "orange", 0, 72, 50, 24))],
      ["b", tile(glyph("triangle", "orange", 0, 28, 50, 24), glyph("square", "orange", 0, 72, 50, 24))],
      ["c", tile(glyph("square", "blue", 0, 28, 50, 24), glyph("triangle", "blue", 0, 72, 50, 24))],
      ["d", tile(glyph("triangle", "orange", 0, 28, 50, 24), glyph("diamond", "orange", 0, 72, 50, 24))],
    ],
    "a",
    "The lower-right cell changes the top-right pair's shapes to triangle and square, then swaps their positions.",
  ),
  pattern(
    "PR-09",
    "Across each row, the symbol count increases by one. Down each column, the color changes and the symbols turn 180 degrees. Select the missing tile.",
    "matrix",
    [
      cluster(1, "green", "triangle"),
      cluster(2, "green", "triangle"),
      cluster(1, "orange", "triangle", 180),
      null,
    ],
    [
      ["a", tile(glyph("triangle", "orange", 180, 20, 50, 16), glyph("triangle", "orange", 180, 80, 50, 16))],
      ["b", tile(glyph("triangle", "orange", 0, 20, 50, 16), glyph("triangle", "orange", 0, 80, 50, 16))],
      ["c", tile(glyph("triangle", "green", 180, 20, 50, 16), glyph("triangle", "green", 180, 80, 50, 16))],
      ["d", tile(glyph("triangle", "orange", 180, 20, 50, 16), glyph("triangle", "orange", 180, 50, 50, 16), glyph("triangle", "orange", 180, 80, 50, 16))],
    ],
    "a",
    "The missing tile has two symbols, orange, and a 180-degree rotation.",
  ),
  pattern(
    "PR-10",
    "The triangle moves clockwise through the corners, rotates 90 degrees clockwise each step, and cycles green, orange, blue. Select the next figure.",
    "sequence",
    [
      single("triangle", "green", 0, 20, 20),
      single("triangle", "orange", 90, 80, 20),
      single("triangle", "blue", 180, 80, 80),
      single("triangle", "green", 270, 20, 80),
      null,
    ],
    [
      ["a", single("triangle", "orange", 0, 20, 20)],
      ["b", single("triangle", "green", 0, 20, 20)],
      ["c", single("triangle", "orange", 270, 20, 20)],
      ["d", single("triangle", "orange", 0, 80, 20)],
    ],
    "a",
    "The next corner is upper-left, the color cycle gives orange, and the next rotation wraps to 0 degrees.",
  ),
];

const patternsById = new Map(patternQuestions.map((question) => [question.id, question]));

export const demoQuestions: DemoQuestion[] = v2Questions
  .filter((question) => question.scoringType === "objective")
  .map((question) => patternsById.get(question.id) ?? { ...question });

export function getPublicDemoQuestion(question: DemoQuestion) {
  return toV2PublicQuestion(question);
}

export function scoreDemoResponse(question: DemoQuestion, response: unknown) {
  return scoreV2Response(question, response);
}

export function getDemoResponseValidationError(question: DemoQuestion, response: unknown) {
  return validateV2Response(question, response);
}

export function isValidDemoResponse(question: DemoQuestion, response: unknown) {
  return getDemoResponseValidationError(question, response) === null;
}

export function scoreAllDemoResponses(responses: Map<string, unknown>) {
  const rounds = ([1, 2, 3, 4, 5] as const).map((round) => {
    const questions = demoQuestions.filter((question) => question.round === round);
    const correct = questions.reduce(
      (total, question) =>
        total + (scoreDemoResponse(question, responses.get(question.id)) ? 1 : 0),
      0,
    );
    return { round, correct, percentage: correct * 10 };
  });
  const totalCorrect = rounds.reduce((total, round) => total + round.correct, 0);
  return {
    totalCorrect,
    percentage: totalCorrect * 2,
    outcome: totalCorrect >= 40 ? "PASS" as const : "FAIL" as const,
    rounds,
  };
}

export function validateDemoBank() {
  const ids = new Set(demoQuestions.map((question) => question.id));
  const roundCounts = [1, 2, 3, 4, 5].map(
    (round) => demoQuestions.filter((question) => question.round === round).length,
  );
  const validPatterns = patternQuestions.length === 10 &&
    patternQuestions.every((question) => {
      const keyIsAvailable = question.options?.some((option) => option.id === question.key);
      const keyedChoiceCount = question.visual?.choices.filter(
        (option) => option.id === question.key,
      ).length;
      return keyIsAvailable && keyedChoiceCount === 1 &&
        question.visual?.choices.length === 4 &&
        new Set(question.visual.choices.map((option) => option.id)).size === 4 &&
        new Set(question.visual.choices.map((option) => JSON.stringify(option.tile))).size === 4;
    });
  if (
    demoQuestions.length !== 50 ||
    ids.size !== 50 ||
    demoQuestions.some((question) => question.scoringType !== "objective") ||
    roundCounts.some((count) => count !== 10) ||
    !validPatterns
  ) {
    throw new Error("Assessment question set failed its structural checks.");
  }
  for (const question of demoQuestions) {
    if (question.options && !question.options.some((option) => option.id === question.key)) {
      throw new Error(`Assessment question ${question.id} has no keyed option.`);
    }
  }
}
