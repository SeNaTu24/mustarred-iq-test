import "server-only";

export const DEMO_QUESTION_SET_VERSION = "mustarred-assessment-2026-10-v2";
export const DEMO_QUESTION_SET_LABEL = "Mustarred assessment";
export const DEMO_SCORING_RULE_VERSION = "mustarred-objective-scoring-v2";

export type RoundNumber = 1 | 2 | 3 | 4 | 5;
export type QuestionFormat = "normal" | "pattern" | "game";
export type ScoringType = "objective" | "behavioral";
export type PatternShape = "circle" | "square" | "triangle" | "diamond";

type Glyph = {
  shape: PatternShape;
  color: string;
  rotation?: number;
  x?: number;
  y?: number;
  size?: number;
};

type PatternTile = { glyphs: Glyph[] };

export interface DemoQuestion {
  id: string;
  round: RoundNumber;
  roundTitle: string;
  format: QuestionFormat;
  scoringType: ScoringType;
  text: string;
  options?: Array<{ id: string; label: string }>;
  visual?: {
    layout: "sequence" | "matrix";
    tiles: Array<PatternTile | null>;
    choices: Array<{ id: string; tile: PatternTile }>;
  };
  game?: {
    type: "sudoku" | "block-placement" | "rotation";
    instruction: string;
    size?: number;
    puzzle?: number[][];
    boardSize?: number;
    targetCells?: Array<{ x: number; y: number }>;
    pieceCells?: Array<{ x: number; y: number }>;
    shape?: PatternTile;
  };
  key?: string | string[] | number | Record<string, number>;
  rationale?: string;
}

const roundTitles: Record<RoundNumber, string> = {
  1: "Pattern recognition",
  2: "Reasoning and logic",
  3: "Numerical and spatial games",
  4: "Risk management",
  5: "Workplace judgement",
};

const colors = {
  green: "#214f3c",
  orange: "#c56c42",
  blue: "#527d91",
  purple: "#75618f",
} as const;

function glyph(
  shape: PatternShape,
  color: string,
  rotation = 0,
  x = 50,
  y = 50,
  size = 30,
): Glyph {
  return { shape, color, rotation, x, y, size };
}

function tile(...glyphs: Glyph[]): PatternTile {
  return { glyphs };
}

function choice(
  id: string,
  round: RoundNumber,
  text: string,
  options: Array<[string, string]>,
  key: string,
  rationale: string,
  format: "normal" | "pattern" = "normal",
  visual?: DemoQuestion["visual"],
): DemoQuestion {
  return {
    id,
    round,
    roundTitle: roundTitles[round],
    format,
    scoringType: "objective",
    text,
    options: options.map(([optionId, label]) => ({ id: optionId, label })),
    ...(visual ? { visual } : {}),
    key,
    rationale,
  };
}

function game(
  id: string,
  round: RoundNumber,
  text: string,
  instruction: string,
  type: NonNullable<DemoQuestion["game"]>["type"],
  key: NonNullable<DemoQuestion["key"]>,
  rationale: string,
  details: Omit<NonNullable<DemoQuestion["game"]>, "type" | "instruction">,
): DemoQuestion {
  return {
    id,
    round,
    roundTitle: roundTitles[round],
    format: "game",
    scoringType: "objective",
    text,
    game: { type, instruction, ...details },
    key,
    rationale,
  };
}

function visualChoice(
  id: string,
  text: string,
  layout: "sequence" | "matrix",
  tiles: Array<PatternTile | null>,
  choices: Array<[string, PatternTile]>,
  key: string,
  rationale: string,
) {
  return choice(
    id,
    1,
    text,
    choices.map(([optionId], index) => [
      optionId,
      `Option ${String.fromCharCode(65 + index)}`,
    ]),
    key,
    rationale,
    "pattern",
    {
      layout,
      tiles,
      choices: choices.map(([optionId, pattern]) => ({
        id: optionId,
        tile: pattern,
      })),
    },
  );
}

const square = (color: string, rotation = 0) =>
  tile(glyph("square", color, rotation));
const circle = (color: string, rotation = 0) =>
  tile(glyph("circle", color, rotation));
const triangle = (color: string, rotation = 0) =>
  tile(glyph("triangle", color, rotation));
const diamond = (color: string, rotation = 0) =>
  tile(glyph("diamond", color, rotation));

const visualQuestions: DemoQuestion[] = [
  visualChoice(
    "PR-01",
    "Select the figure that continues the rotation.",
    "sequence",
    [triangle(colors.green, 0), triangle(colors.green, 90), triangle(colors.green, 180), null],
    [
      ["a", triangle(colors.green, 90)],
      ["b", triangle(colors.green, 270)],
      ["c", square(colors.green, 270)],
      ["d", triangle(colors.orange, 270)],
    ],
    "b",
    "The triangle turns 90 degrees clockwise at each step.",
  ),
  visualChoice(
    "PR-02",
    "Select the figure that completes the growing sequence.",
    "sequence",
    [
      tile(glyph("circle", colors.blue)),
      tile(glyph("circle", colors.blue, 0, 36, 50, 23), glyph("circle", colors.blue, 0, 64, 50, 23)),
      tile(glyph("circle", colors.blue, 0, 28, 50, 20), glyph("circle", colors.blue, 0, 50, 50, 20), glyph("circle", colors.blue, 0, 72, 50, 20)),
      null,
    ],
    [
      ["a", square(colors.blue)],
      ["b", tile(glyph("circle", colors.blue, 0, 20, 50, 17), glyph("circle", colors.blue, 0, 40, 50, 17), glyph("circle", colors.blue, 0, 60, 50, 17), glyph("circle", colors.blue, 0, 80, 50, 17))],
      ["c", tile(glyph("circle", colors.blue, 0, 25, 50, 18), glyph("circle", colors.blue, 0, 50, 50, 18), glyph("circle", colors.blue, 0, 75, 50, 18))],
      ["d", tile(glyph("circle", colors.orange, 0, 20, 50, 17), glyph("circle", colors.orange, 0, 40, 50, 17), glyph("circle", colors.orange, 0, 60, 50, 17), glyph("circle", colors.orange, 0, 80, 50, 17))],
    ],
    "b",
    "The sequence adds one blue circle each time.",
  ),
  visualChoice(
    "PR-03",
    "Select the figure that comes next.",
    "sequence",
    [circle(colors.orange), circle(colors.blue), circle(colors.orange), circle(colors.blue), null],
    [["a", circle(colors.orange)], ["b", circle(colors.blue)], ["c", square(colors.orange)], ["d", diamond(colors.orange)]],
    "a",
    "The circle alternates between orange and blue, so orange follows blue.",
  ),
  visualChoice(
    "PR-04",
    "Select the figure that continues the shape sequence.",
    "sequence",
    [circle(colors.green), triangle(colors.green), square(colors.green), circle(colors.green), null],
    [["a", circle(colors.green)], ["b", triangle(colors.green)], ["c", square(colors.green)], ["d", diamond(colors.green)]],
    "b",
    "The three shapes repeat in order: circle, triangle, square.",
  ),
  visualChoice(
    "PR-05",
    "Select the figure that completes the sequence.",
    "sequence",
    [square(colors.purple, 0), square(colors.purple, 45), square(colors.purple, 90), null],
    [["a", square(colors.purple, 45)], ["b", square(colors.purple, 135)], ["c", diamond(colors.purple)], ["d", square(colors.orange, 135)]],
    "b",
    "The square rotates 45 degrees clockwise at each step.",
  ),
  visualChoice(
    "PR-06",
    "Each row and column follows the same change. Select the missing figure.",
    "matrix",
    [circle(colors.green), circle(colors.blue), square(colors.green), null],
    [["a", square(colors.blue)], ["b", square(colors.orange)], ["c", circle(colors.purple)], ["d", triangle(colors.blue)]],
    "a",
    "Across each row the color changes from green to blue; down each column the shape changes from circle to square.",
  ),
  visualChoice(
    "PR-07",
    "Select the figure that completes the matrix.",
    "matrix",
    [circle(colors.orange), tile(glyph("circle", colors.orange), glyph("circle", colors.orange, 0, 70, 70, 18)), square(colors.orange), null],
    [
      ["a", tile(glyph("square", colors.orange), glyph("square", colors.orange, 0, 70, 70, 18))],
      ["b", square(colors.orange)],
      ["c", tile(glyph("circle", colors.orange), glyph("circle", colors.orange, 0, 70, 70, 18), glyph("circle", colors.orange, 0, 30, 70, 18))],
      ["d", tile(glyph("square", colors.blue), glyph("square", colors.blue, 0, 70, 70, 18))],
    ],
    "a",
    "The second column has two of each shape; the second row changes circles to squares.",
  ),
  visualChoice(
    "PR-08",
    "Each row changes shape from left to right, while each column changes color. Select the missing figure.",
    "matrix",
    [triangle(colors.blue), square(colors.blue), triangle(colors.orange), null],
    [["a", square(colors.orange)], ["b", diamond(colors.orange)], ["c", triangle(colors.purple)], ["d", circle(colors.orange)]],
    "a",
    "The shape changes from triangle to square across the row, and the color changes from blue to orange down the column.",
  ),
  visualChoice(
    "PR-09",
    "Select the figure that completes the matrix.",
    "matrix",
    [triangle(colors.green, 0), triangle(colors.green, 90), square(colors.green, 0), null],
    [["a", square(colors.green, 90)], ["b", square(colors.green, 180)], ["c", triangle(colors.green, 180)], ["d", square(colors.orange, 90)]],
    "a",
    "Moving right rotates each shape 90 degrees clockwise; moving down changes the triangle to a square.",
  ),
  visualChoice(
    "PR-10",
    "Each tile adds one symbol while changing its color in a repeating cycle. Select the next tile.",
    "sequence",
    [
      tile(glyph("diamond", colors.green)),
      tile(glyph("diamond", colors.orange, 0, 40, 50, 21), glyph("diamond", colors.orange, 0, 65, 50, 21)),
      tile(glyph("diamond", colors.blue, 0, 28, 50, 18), glyph("diamond", colors.blue, 0, 50, 50, 18), glyph("diamond", colors.blue, 0, 72, 50, 18)),
      null,
    ],
    [
      ["a", tile(glyph("diamond", colors.green, 0, 20, 50, 16), glyph("diamond", colors.green, 0, 40, 50, 16), glyph("diamond", colors.green, 0, 60, 50, 16), glyph("diamond", colors.green, 0, 80, 50, 16))],
      ["b", tile(glyph("diamond", colors.orange, 0, 20, 50, 16), glyph("diamond", colors.orange, 0, 40, 50, 16), glyph("diamond", colors.orange, 0, 60, 50, 16), glyph("diamond", colors.orange, 0, 80, 50, 16))],
      ["c", tile(glyph("diamond", colors.blue, 0, 20, 50, 16), glyph("diamond", colors.blue, 0, 40, 50, 16), glyph("diamond", colors.blue, 0, 60, 50, 16), glyph("diamond", colors.blue, 0, 80, 50, 16))],
      ["d", tile(glyph("diamond", colors.green, 0, 20, 50, 16), glyph("diamond", colors.orange, 0, 40, 50, 16), glyph("diamond", colors.blue, 0, 60, 50, 16), glyph("diamond", colors.green, 0, 80, 50, 16))],
    ],
    "a",
    "The symbol count rises by one, and the colors repeat green, orange, blue, green.",
  ),
];

const logicQuestions: DemoQuestion[] = [
  choice("RL-01", 2, "All approved vendors have completed a security review. Northstar is an approved vendor. What follows?", [["a", "Northstar has completed a security review"], ["b", "Northstar has no security risks"], ["c", "Every reviewed vendor is approved"], ["d", "Northstar was reviewed this week"]], "a", "The stated rule applies to every approved vendor, including Northstar."),
  choice("RL-02", 2, "If the alert is active, the backup system is checked. The backup system was not checked. What can be concluded?", [["a", "The alert must be active"], ["b", "The alert was not active"], ["c", "The backup system failed"], ["d", "No conclusion is possible"]], "b", "The conditional and the absence of its required consequence establish that the alert was not active."),
  choice("RL-03", 2, "A, C, F, J, O, … Which letter comes next?", [["a", "S"], ["b", "T"], ["c", "U"], ["d", "V"]], "c", "The jumps increase by one letter each time: +2, +3, +4, +5, then +6."),
  choice("RL-04", 2, "Four reports are reviewed in sequence. Mina is before Joel; Priya is after Joel; Kai is before Mina. Who must be first?", [["a", "Mina"], ["b", "Joel"], ["c", "Priya"], ["d", "Kai"]], "d", "Kai is before Mina, who is before Joel, who is before Priya."),
  choice("RL-05", 2, "Three machines make 3 parts in 3 minutes at the same rate. How long would 6 machines take to make 6 parts?", [["a", "3 minutes"], ["b", "6 minutes"], ["c", "9 minutes"], ["d", "18 minutes"]], "a", "Each machine makes one part in three minutes; six machines can make six parts in the same three minutes."),
  choice("RL-06", 2, "A note says every order marked urgent ships today. One order marked urgent did not ship today. Which statement is inconsistent with the note?", [["a", "That order was marked urgent"], ["b", "The note's rule was followed for every urgent order"], ["c", "The order was delayed"], ["d", "Some orders shipped today"]], "b", "The observed order directly contradicts the universal rule that every urgent order ships today."),
  choice("RL-07", 2, "A sequence doubles and then subtracts one: 3, 5, 9, 17, … What comes next?", [["a", "31"], ["b", "32"], ["c", "33"], ["d", "35"]], "c", "Applying the rule gives 17 × 2 − 1 = 33."),
  choice("RL-08", 2, "No item in batch A is in batch B. Some items in batch C are in batch A. What must be true?", [["a", "Some items in C are not in B"], ["b", "All items in C are in A"], ["c", "No items in C are in B"], ["d", "Some items in B are in A"]], "a", "Items shared by C and A cannot belong to B, because A and B do not overlap."),
  choice("RL-09", 2, "A team records a result only after two independent checks agree. A result was recorded. What follows?", [["a", "Both checks agreed"], ["b", "The result was correct"], ["c", "The checks were performed by different teams"], ["d", "A manager approved it"]], "a", "Recording requires agreement between the two checks; the rule does not establish who performed them or guarantee correctness."),
  choice("RL-10", 2, "Which value is the outlier in 8, 12, 18, 24, 30?", [["a", "8"], ["b", "12"], ["c", "18"], ["d", "30"]], "a", "The other values are multiples of six; eight is not."),
];

const numericalQuestions: DemoQuestion[] = [
  choice("NS-01", 3, "A service handles 240 requests in 6 hours at a steady rate. At that rate, how many requests does it handle in 9 hours?", [["a", "320"], ["b", "340"], ["c", "360"], ["d", "400"]], "c", "The rate is 40 requests per hour; 40 × 9 = 360."),
  choice("NS-02", 3, "A £75 item is discounted by 20%, then a £6 delivery charge is added. What is the total?", [["a", "£60"], ["b", "£66"], ["c", "£69"], ["d", "£75"]], "b", "Twenty percent of £75 is £15; £75 − £15 + £6 = £66."),
  choice("NS-03", 3, "A team has 18 hours available. Three equal tasks take 4 hours each, and one review takes 5 hours. How many hours remain?", [["a", "1"], ["b", "2"], ["c", "3"], ["d", "5"]], "a", "The work takes 12 + 5 = 17 hours, leaving one hour."),
  choice("NS-04", 3, "A rectangular storage area is 6 m by 4 m. What is its area?", [["a", "10 m²"], ["b", "20 m²"], ["c", "24 m²"], ["d", "28 m²"]], "c", "Area is length multiplied by width: 6 × 4 = 24 m²."),
  game("NS-05", 3, "Complete the 4 × 4 number grid. Each row, column and 2 × 2 box must contain 1, 2, 3 and 4 once.", "Select an empty cell, then enter a number. You may leave cells blank; an incomplete grid will be saved and scored.", "sudoku", ["1", "2", "3", "4", "3", "4", "1", "2", "2", "1", "4", "3", "4", "3", "2", "1"], "One point is awarded only when the completed grid matches the unique solution.", { size: 4, puzzle: [[1, 0, 0, 4], [0, 4, 1, 0], [0, 1, 4, 0], [4, 0, 0, 1]] }),
  game("NS-06", 3, "Complete the 4 × 4 number grid. Each row, column and 2 × 2 box must contain 1, 2, 3 and 4 once.", "Select an empty cell, then enter a number. You may leave cells blank; an incomplete grid will be saved and scored.", "sudoku", ["2", "1", "4", "3", "4", "3", "2", "1", "1", "2", "3", "4", "3", "4", "1", "2"], "One point is awarded only when the completed grid matches the unique solution.", { size: 4, puzzle: [[2, 0, 0, 3], [0, 3, 2, 0], [0, 2, 3, 0], [3, 0, 0, 2]] }),
  game("NS-07", 3, "Place the three-square piece inside the outlined corner.", "Click a board cell to set the piece's top-left position. Rotate the piece to fit the outline.", "block-placement", { x: 2, y: 1, rotation: 0 }, "One point is awarded for placing the piece in the keyed position and orientation.", { boardSize: 5, targetCells: [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 2 }], pieceCells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] }),
  game("NS-08", 3, "Fit the bar into the vertical outline.", "Click a board cell to place the bar's first square, then rotate it until it matches the outline.", "block-placement", { x: 3, y: 1, rotation: 90 }, "One point is awarded for placing the bar in the keyed position and orientation.", { boardSize: 5, targetCells: [{ x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 }], pieceCells: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }] }),
  game("NS-09", 3, "Rotate the marked piece until its point faces down.", "Use the rotation controls to turn the piece one quarter-turn at a time. Your current orientation is shown.", "rotation", 2, "The piece starts pointing up; two clockwise quarter-turns point it down.", { shape: triangle(colors.green) }),
  game("NS-10", 3, "Rotate the triangle until its point faces left.", "Use the rotation controls to turn the piece one quarter-turn at a time. Your current orientation is shown.", "rotation", 3, "The triangle starts pointing up; three clockwise quarter-turns point it left.", { shape: triangle(colors.orange) }),
];

const riskQuestions: DemoQuestion[] = [
  choice("RM-01", 4, "A payment-control warning appears after a supplier bank-detail change. The payment is due today. What should happen first?", [["a", "Pause the payment and verify the change through the established contact channel"], ["b", "Pay the old account and investigate later"], ["c", "Ask the sender to confirm by replying to the same email"], ["d", "Split the payment into smaller transfers"]], "a", "Pausing and independently verifying the change prevents a potentially irreversible misdirected payment."),
  choice("RM-02", 4, "A customer-data link is accessible to anyone with the URL. What is the best immediate response?", [["a", "Disable access, preserve details, and notify the privacy/security owner"], ["b", "Wait for a customer to report misuse"], ["c", "Delete the file and take no further action"], ["d", "Send the link to the whole team to check"]], "a", "Contain exposure promptly and use the incident process; preserve enough information for investigation."),
  choice("RM-03", 4, "A critical control has not been tested this quarter, and a high-impact launch is tomorrow. Best next step?", [["a", "Record the gap, assess exposure with the control owner, and agree a safe launch decision"], ["b", "Assume the control still works"], ["c", "Launch and test if an incident occurs"], ["d", "Remove the control from the checklist"]], "a", "The untested control is an evidence gap requiring an explicit risk-based decision before launch."),
  choice("RM-04", 4, "Two incidents occur: a low-impact typo in an internal note and a suspected account takeover. Which should be prioritised?", [["a", "The account takeover"], ["b", "The typo, because it is easier to fix"], ["c", "Both receive equal attention regardless of impact"], ["d", "Neither until the next review"]], "a", "A suspected account takeover has greater potential impact and urgency."),
  choice("RM-05", 4, "A supplier misses a milestone, but the delivery date is not yet affected. What is the most useful action?", [["a", "Confirm recovery options and dependencies, then update the risk owner"], ["b", "Promise the customer the original date without checking"], ["c", "Wait until the delivery date passes"], ["d", "Cancel the contract immediately"]], "a", "Early verification and contingency planning reduce uncertainty without overstating impact."),
  choice("RM-06", 4, "A safety sensor gives inconsistent readings. No incident has occurred. What should the operator do?", [["a", "Pause affected work if safe, report the readings, and follow the approved check before resuming"], ["b", "Continue until a reading confirms a failure"], ["c", "Disable the sensor"], ["d", "Record the most common reading only"]], "a", "Unreliable safety readings require safe containment and an approved verification process."),
  choice("RM-07", 4, "A project can buy extra capacity or accept a small delay. The extra capacity costs more than the delay would. What should inform the decision?", [["a", "Compare expected loss, customer impact, and the cost of mitigation"], ["b", "Choose the option with the larger budget"], ["c", "Avoid documenting the trade-off"], ["d", "Use the original plan regardless of new evidence"]], "a", "The decision should compare the costs and likely consequences of each defensible option."),
  choice("RM-08", 4, "A team proposes sharing an entire customer export with a partner to answer one query. Best response?", [["a", "Confirm authority and share only the minimum necessary through an approved channel"], ["b", "Send the export to save time"], ["c", "Remove first names but keep all other fields"], ["d", "Ask the partner to choose what they need after receipt"]], "a", "Verify the purpose and authority, then minimise data and use a controlled channel."),
  choice("RM-09", 4, "An error rate exceeds a documented rollback threshold. Rollback is tested and available. What comes first?", [["a", "Start rollback and notify the incident owner"], ["b", "Wait for more data before acting"], ["c", "Change unrelated settings"], ["d", "Disable monitoring"]], "a", "The agreed guardrail and tested rollback define the immediate response."),
  choice("RM-10", 4, "A risk owner says a mitigation is complete, but there is no evidence it was implemented. What should the reviewer do?", [["a", "Request evidence and reassess the remaining exposure before closing the risk"], ["b", "Close it based on the owner’s confidence"], ["c", "Assume implementation from the project plan"], ["d", "Remove the risk from reporting"]], "a", "A control should be verified before the risk is treated as mitigated."),
];

const workplaceQuestions: DemoQuestion[] = [
  choice("WJ-01", 5, "A product sells for £80. Variable costs are £46 per unit; fixed costs are unchanged. What is its contribution per unit?", [["a", "£26"], ["b", "£34"], ["c", "£46"], ["d", "£126"]], "b", "Contribution per unit is selling price minus variable cost: £80 − £46 = £34."),
  choice("WJ-02", 5, "A campaign brings £18,000 in sales and £11,000 in variable costs. What is its contribution before fixed costs?", [["a", "£7,000"], ["b", "£11,000"], ["c", "£18,000"], ["d", "£29,000"]], "a", "Contribution is revenue less variable costs: £18,000 − £11,000 = £7,000."),
  choice("WJ-03", 5, "A price reduction increases units sold, but the margin per unit falls. Which information best indicates whether the change helped?", [["a", "Total contribution before and after the change"], ["b", "Units sold only"], ["c", "Number of social-media comments"], ["d", "The list price alone"]], "a", "Total contribution combines volume and unit margin, allowing a like-for-like commercial comparison."),
  choice("WJ-04", 5, "A major customer requests a discount in return for a larger order. What should be assessed first?", [["a", "Incremental contribution, capacity, payment terms, and concentration risk"], ["b", "The headline order value only"], ["c", "Whether a competitor offers a discount"], ["d", "The size of the requested discount alone"]], "a", "A larger order is useful only if its additional economics and delivery risks are understood."),
  choice("WJ-05", 5, "A new channel has promising demand but higher fulfilment costs. Which first test is most informative?", [["a", "A limited pilot measuring demand, fulfilment cost, and repeat purchase"], ["b", "A large launch based on forecast volume"], ["c", "A survey with no cost estimate"], ["d", "A price cut across all channels"]], "a", "A measured pilot tests the key demand and cost assumptions before wider investment."),
  choice("WJ-06", 5, "A colleague says a handoff left them unclear about what to do next. You thought the message was clear. What is the most useful response?", [["a", "Ask which part was unclear, listen, then agree what information the next handoff needs"], ["b", "Explain that the instructions were already in the message"], ["c", "Forward the same message to their manager"], ["d", "Take the task back without discussing what went wrong"]], "a", "Inviting specific feedback and agreeing a practical adjustment addresses the issue without assuming intent."),
  choice("WJ-07", 5, "In a meeting, two colleagues disagree about a missed deadline and begin speaking over each other. You are facilitating. What should you do first?", [["a", "Pause the exchange, restate the shared goal, and hear each account in turn"], ["b", "Decide who is responsible based on the timeline"], ["c", "Move on so the meeting stays on schedule"], ["d", "Ask the more senior colleague to settle it"]], "a", "A fair discussion makes space for both accounts and brings attention back to the shared outcome."),
  choice("WJ-08", 5, "A teammate seems withdrawn after receiving critical feedback. You want to check in without making assumptions. What is a good opening?", [["a", "Would it help to talk through the feedback? No pressure if you would rather not."], ["b", "You are taking that feedback badly; let me explain it."], ["c", "I will tell the manager you need support."], ["d", "Why are you being so quiet?"]], "a", "A private, open invitation offers support while letting the colleague choose whether to talk."),
  choice("WJ-09", 5, "You realise your brief comment in a team chat sounded dismissive. A colleague has not replied. What should you do?", [["a", "Follow up privately, acknowledge how it may have sounded, and ask if they want to discuss it"], ["b", "Delete the message and say nothing"], ["c", "Ask other teammates whether the colleague is upset"], ["d", "Wait for them to raise it"]], "a", "Acknowledging the impact and inviting a conversation is direct while avoiding assumptions about their feelings."),
  choice("WJ-10", 5, "A colleague challenges your proposal in front of the team. You disagree with their conclusion. What is the most constructive response?", [["a", "Ask which evidence or concern is driving their view, then compare it with yours"], ["b", "Defend the proposal before hearing the concern"], ["c", "End the discussion and raise it with their manager"], ["d", "Agree publicly but continue with your original plan"]], "a", "Understanding the concern first supports a better evidence-based discussion and keeps disagreement focused on the work."),
];

const behavioralQuestions: DemoQuestion[] = [
  {
    id: "WP-01",
    round: 5,
    roundTitle: roundTitles[5],
    format: "normal",
    scoringType: "behavioral",
    text: "When priorities change during a busy week, which approach is closest to how you usually work?",
    options: [
      { id: "a", label: "Re-plan my tasks and confirm what should move" },
      { id: "b", label: "Keep my original plan unless someone asks me to change it" },
      { id: "c", label: "Focus on the newest request first" },
      { id: "d", label: "Ask for help comparing the competing deadlines" },
    ],
  },
  {
    id: "WP-02",
    round: 5,
    roundTitle: roundTitles[5],
    format: "normal",
    scoringType: "behavioral",
    text: "When a colleague is frustrated with a decision, what would you be most likely to do first?",
    options: [
      { id: "a", label: "Listen to their concern and check I understand it" },
      { id: "b", label: "Explain the decision and its constraints" },
      { id: "c", label: "Suggest a practical next step" },
      { id: "d", label: "Give them time, then check whether they want to talk" },
    ],
  },
  {
    id: "WP-03",
    round: 5,
    roundTitle: roundTitles[5],
    format: "normal",
    scoringType: "behavioral",
    text: "Which kind of work tends to bring out your best?",
    options: [
      { id: "a", label: "Working through a complex problem independently" },
      { id: "b", label: "Collaborating with others toward a shared outcome" },
      { id: "c", label: "Organising a clear process and keeping it on track" },
      { id: "d", label: "Adapting quickly when priorities or information change" },
    ],
  },
  {
    id: "WP-04",
    round: 5,
    roundTitle: roundTitles[5],
    format: "normal",
    scoringType: "behavioral",
    text: "If you notice that your work may contain an error, what would you be most likely to do?",
    options: [
      { id: "a", label: "Check the facts, then tell anyone affected and correct it" },
      { id: "b", label: "Ask a colleague to review it with me" },
      { id: "c", label: "Work out the impact before deciding who to tell" },
      { id: "d", label: "Follow the usual reporting process straight away" },
    ],
  },
  {
    id: "WP-05",
    round: 5,
    roundTitle: roundTitles[5],
    format: "normal",
    scoringType: "behavioral",
    text: "When receiving feedback that is difficult to hear, which response feels most natural?",
    options: [
      { id: "a", label: "Ask for a specific example and consider what to change" },
      { id: "b", label: "Take time to reflect before responding" },
      { id: "c", label: "Explain the context behind my decision" },
      { id: "d", label: "Agree a follow-up to check progress" },
    ],
  },
];

export const demoQuestions: DemoQuestion[] = [
  ...visualQuestions,
  ...logicQuestions,
  ...numericalQuestions,
  ...riskQuestions,
  ...workplaceQuestions,
  ...behavioralQuestions,
];

export function getPublicDemoQuestion(question: DemoQuestion) {
  return {
    id: question.id,
    round: question.round,
    roundTitle: question.roundTitle,
    format: question.format,
    responseType: question.scoringType,
    text: question.text,
    ...(question.options ? { options: question.options } : {}),
    ...(question.visual ? { visual: question.visual } : {}),
    ...(question.game ? { game: question.game } : {}),
  };
}

export function demoBankQuestion(questionId: string) {
  return demoQuestions.find((question) => question.id === questionId);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameArray(left: unknown, right: string[]) {
  return Array.isArray(left) && left.length === right.length &&
    left.every((entry, index) => entry === right[index]);
}

export function scoreDemoResponse(
  question: DemoQuestion,
  response: unknown,
): boolean {
  if (question.scoringType !== "objective" || question.key === undefined) return false;
  if (question.game?.type === "sudoku") {
    return sameArray(response, question.key as string[]);
  }
  if (question.game?.type === "block-placement") {
    return isObject(response) &&
      response.x === (question.key as Record<string, number>).x &&
      response.y === (question.key as Record<string, number>).y &&
      response.rotation === (question.key as Record<string, number>).rotation;
  }
  if (question.game?.type === "rotation") {
    return response === question.key;
  }
  return typeof response === "string" && response === question.key;
}

export function getDemoResponseValidationError(
  question: DemoQuestion,
  response: unknown,
): string | null {
  if (question.scoringType === "behavioral" || !question.game) {
    return question.options && typeof response === "string" &&
      question.options.some((option) => option.id === response)
      ? null
      : question.options
        ? "Select one of the listed responses."
        : "This question has no available response options. Please refresh the assessment.";
  }
  if (question.game.type === "sudoku") {
    const puzzle = question.game.puzzle ?? [];
    const valid = Array.isArray(response) &&
      response.length === 16 &&
      response.every((value) => typeof value === "string" && /^[1-4]?$/.test(value)) &&
      puzzle.flat().every((clue, index) => clue === 0 || response[index] === String(clue));
    return valid
      ? null
      : "Use the numbers 1 to 4 in the grid, keeping the given numbers unchanged.";
  }
  if (question.game.type === "block-placement") {
    if (!isObject(response) || Object.keys(response).length !== 3) {
      return "Choose a board position and rotation for the piece.";
    }
    return Number.isInteger(response.x) && Number.isInteger(response.y) &&
      Number.isInteger(response.rotation) &&
      Number(response.x) >= 0 && Number(response.x) < 5 &&
      Number(response.y) >= 0 && Number(response.y) < 5 &&
      [0, 90, 180, 270].includes(Number(response.rotation))
      ? null
      : "Choose a board cell and rotate the piece in quarter-turns.";
  }
  return Number.isInteger(response) && Number(response) >= 0 && Number(response) <= 3
    ? null
    : "Rotate the piece using the on-screen controls before saving.";
}

export function isValidDemoResponse(
  question: DemoQuestion,
  response: unknown,
): boolean {
  return getDemoResponseValidationError(question, response) === null;
}

export function scoreAllDemoResponses(
  responses: Map<string, unknown>,
): {
  totalCorrect: number;
  percentage: number;
  outcome: "PASS" | "FAIL";
  rounds: Array<{ round: RoundNumber; correct: number; percentage: number }>;
} {
  const rounds = ([1, 2, 3, 4, 5] as const).map((round) => {
    const roundQuestions = demoQuestions.filter(
      (question) => question.round === round && question.scoringType === "objective",
    );
    const correct = roundQuestions.reduce(
      (count, question) =>
        count + (scoreDemoResponse(question, responses.get(question.id)) ? 1 : 0),
      0,
    );
    return { round, correct, percentage: correct * 10 };
  });
  const totalCorrect = rounds.reduce((total, round) => total + round.correct, 0);
  return {
    totalCorrect,
    percentage: totalCorrect * 2,
    outcome: totalCorrect >= 40 ? "PASS" : "FAIL",
    rounds,
  };
}

export function validateDemoBank() {
  const ids = new Set(demoQuestions.map((question) => question.id));
  const scoredQuestions = demoQuestions.filter(
    (question) => question.scoringType === "objective",
  );
  const behavioralQuestionsOnly = demoQuestions.filter(
    (question) => question.scoringType === "behavioral",
  );
  const valid = demoQuestions.length === 55 &&
    ids.size === 55 &&
    scoredQuestions.length === 50 &&
    behavioralQuestionsOnly.length === 5 &&
    [1, 2, 3, 4, 5].every(
      (round) => scoredQuestions.filter((question) => question.round === round).length === 10,
    ) &&
    behavioralQuestionsOnly.every((question) => question.round === 5);
  if (!valid) {
    throw new Error("Assessment question set failed its structural checks.");
  }
}
