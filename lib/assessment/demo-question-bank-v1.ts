import "server-only";

export const DEMO_QUESTION_SET_VERSION = "mustarred-demo-2026-10-16-v1";
export const DEMO_QUESTION_SET_LABEL =
  "TEMPORARY DEMO/TEST DATA — not CEO-approved recruitment questions";

export type RoundNumber = 1 | 2 | 3 | 4 | 5;
export type QuestionFormat = "normal" | "pattern" | "game";
export type GameType = "allocation" | "order" | "priority" | "ranking" | "matching";

export interface DemoQuestion {
  id: string;
  round: RoundNumber;
  roundTitle: string;
  format: QuestionFormat;
  text: string;
  options?: Array<{ id: string; label: string }>;
  game?: {
    type: GameType;
    instruction: string;
    items: Array<{ id: string; label: string }>;
    extraItem?: { id: string; label: string };
    matches?: Array<{ id: string; label: string }>;
  };
  key:
    | string
    | string[]
    | Record<string, string | number | string[]>;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

const roundTitles = {
  1: "Commercial awareness",
  2: "Personality and execution",
  3: "Creativity and adaptability",
  4: "Risk awareness",
  5: "Emotional intelligence",
} satisfies Record<RoundNumber, string>;

function choice(
  id: string,
  round: RoundNumber,
  format: "normal" | "pattern",
  text: string,
  options: Array<[string, string]>,
  key: string,
): DemoQuestion {
  return {
    id,
    round,
    roundTitle: roundTitles[round],
    format,
    text,
    options: options.map(([optionId, label]) => ({ id: optionId, label })),
    key,
  };
}

function game(
  id: string,
  round: RoundNumber,
  text: string,
  instruction: string,
  type: GameType,
  items: Array<[string, string]>,
  key:
    | string
    | string[]
    | Record<string, string | number | string[]>,
  extraItem?: [string, string],
  matches?: Array<[string, string]>,
): DemoQuestion {
  return {
    id,
    round,
    roundTitle: roundTitles[round],
    format: "game",
    text,
    game: {
      type,
      instruction,
      items: items.map(([itemId, label]) => ({ id: itemId, label })),
      ...(extraItem
        ? { extraItem: { id: extraItem[0], label: extraItem[1] } }
        : {}),
      ...(matches
        ? { matches: matches.map(([matchId, label]) => ({ id: matchId, label })) }
        : {}),
    },
    key,
  };
}

export const demoQuestions: DemoQuestion[] = [
  choice("CA-01", 1, "normal", "A product sells for £48 and has a variable cost of £31 per unit. What is its contribution per unit before fixed costs?", [["a", "£13"], ["b", "£17"], ["c", "£31"], ["d", "£79"]], "b"),
  choice("CA-02", 1, "pattern", "Monthly enquiries were 120, 145, 170, and 195. If the same pattern continues, what is next?", [["a", "205"], ["b", "215"], ["c", "220"], ["d", "240"]], "c"),
  game("CA-03", 1, "TEMP DEMO GAME: Allocate 10 tokens. The customer backlog needs at least 5, the viable pilot needs exactly 3, and reserve needs at least 1. Choose where the final token goes.", "Assign all tokens. Fixed amounts are 5 to backlog, 3 to pilot, and 1 to reserve; allocate the last token to backlog or reserve.", "allocation", [["backlog", "Customer backlog"], ["pilot", "Product pilot"], ["reserve", "Contingency reserve"]], { backlog: 6, pilot: 3, reserve: 1 }, ["last-token", "Final token: backlog or reserve"]),
  choice("CA-04", 1, "normal", "A possible delivery delay affects orders due today. Policy requires prompt notice but forbids unconfirmed promises. Best response?", [["a", "Check affected orders and carrier status, then send verified facts and a next-update time"], ["b", "Wait for a confirmed carrier ETA before contacting anyone"], ["c", "Send a blanket discount before checking affected customers"], ["d", "Promise the most likely new date"]], "a"),
  game("CA-05", 1, "TEMP DEMO GAME: Prioritise a 15-minute window. The checkout outage needs 10 minutes of containment; an invoice due at 10:15 takes 5 minutes; slide polishing takes 15 minutes and is due next week.", "Place all three tasks in priority order. Contain the outage first, prepare/send the invoice second, and defer slide polishing third. This is prioritisation; do not simulate doing work.", "priority", [["outage", "Contain checkout outage (10 min)"], ["invoice", "Prepare/send invoice due 10:15 (5 min)"], ["slides", "Polish next week's slides (15 min; defer)"]], ["outage", "invoice", "slides"]),
  choice("CA-06", 1, "normal", "A new market looks promising, but demand and delivery costs are uncertain. What is the most useful first test?", [["a", "Use a distributor forecast as the launch volume"], ["b", "Run a small test measuring demand and delivery cost against agreed success measures"], ["c", "Survey interest but do not estimate fulfilment costs"], ["d", "Use domestic margins and research after launch"]], "b"),
  choice("CA-07", 1, "normal", "At £25 each, 80 units generate £2,000 revenue. At £20 each, 90 units generate:", [["a", "£1,600"], ["b", "£1,800"], ["c", "£2,000"], ["d", "£2,250"]], "b"),
  choice("CA-08", 1, "normal", "A competitor cuts its listed price. Customers differ in price sensitivity and product margins vary. Best first analysis?", [["a", "Compare affected segments, buying reasons, and margin impact before a targeted response"], ["b", "Match every cut for a week"], ["c", "Protect every price until complaints arrive"], ["d", "Stop the lowest-margin product immediately"]], "a"),
  choice("CA-09", 1, "pattern", "A weekly sales index is 4, 8, 16, 32, … What is next?", [["a", "36"], ["b", "48"], ["c", "64"], ["d", "96"]], "c"),
  choice("CA-10", 1, "normal", "Campaign A: £12,000 revenue and £7,000 variable cost. Campaign B: £10,000 revenue and £4,000 variable cost. Which has higher contribution?", [["a", "A by £1,000"], ["b", "B by £1,000"], ["c", "Equal"], ["d", "Cannot compare"]], "b"),

  choice("PE-01", 2, "normal", "You own a task likely to miss its deadline because a dependency is late. Best next step?", [["a", "Report the blocker and wait for a new date"], ["b", "Explain the blocker, give the best estimate, propose a recovery option, and seek the dependency update"], ["c", "Wait to update until the date is certain"], ["d", "Skip review without checking quality risk"]], "b"),
  game("PE-02", 2, "TEMP DEMO GAME: A report is due in 20 minutes. Required tasks take 5 minutes to verify figures, 8 minutes to draft, and 5 minutes to peer-check. Cover polishing takes 15 minutes and is optional.", "Order the required tasks by their dependencies and explicitly exclude optional cover polishing.", "order", [["verify", "Verify figures (5 min)"], ["draft", "Draft report (8 min)"], ["peer", "Peer-check (5 min)"]], { order: ["verify", "draft", "peer"], excluded: ["polish"] }, ["polish", "Polish cover (optional)"]),
  choice("PE-03", 2, "pattern", "Completed tasks over five weeks: 2, 4, 7, 11, 16, … What is next?", [["a", "20"], ["b", "21"], ["c", "22"], ["d", "24"]], "c"),
  choice("PE-04", 2, "normal", "Two requesters want different deliverables at the same time, but capacity allows one. What first?", [["a", "Start the earlier request"], ["b", "Compare deadlines and impact with both, agree priority, and state realistic delivery"], ["c", "Split time evenly before checking usefulness"], ["d", "Ask a manager without giving context"]], "b"),
  game("PE-05", 2, "TEMP DEMO GAME: A verified customer-facing outage is reported while you draft a routine update.", "Alert the incident owner before the other actions; save a draft note before priority confirmation; confirm priority before notifying the requester. No draft resumption is required.", "order", [["alert", "Alert incident owner"], ["save", "Save note of draft state"], ["confirm", "Confirm new priority with manager"], ["notify", "Notify requester of revised ETA"]], ["alert", "save", "confirm", "notify"]),
  choice("PE-06", 2, "normal", "After sending a report, you discover a wrong figure. Best response?", [["a", "Tell recipients promptly, verify the figure, and send a marked correction"], ["b", "Hope nobody notices"], ["c", "Delete the report silently"], ["d", "Blame source data before checking"]], "a"),
  choice("PE-07", 2, "normal", "Your manager suggests a stretch goal, but team capacity is uncertain. Best way to progress?", [["a", "Promise the full goal"], ["b", "Reject it as challenging"], ["c", "Clarify outcome, identify capacity/dependencies, and agree a measurable first milestone"], ["d", "Reduce quality checks"]], "c"),
  choice("PE-08", 2, "pattern", "A weekly output index is 5, 9, 14, 20, 27, … What is next?", [["a", "33"], ["b", "34"], ["c", "35"], ["d", "36"]], "c"),
  game("PE-09", 2, "TEMP DEMO GAME: A handoff is due in 20 minutes. Confirm a missing quantity (2 min), check the draft against it (8 min), then send (2 min).", "Arrange the action cards. The check must occur after confirming the quantity and before sending.", "order", [["confirm", "Confirm quantity"], ["check", "Check draft"], ["send", "Send checked handoff"]], ["confirm", "check", "send"]),
  choice("PE-10", 2, "normal", "Your task is blocked by an input another team has not supplied. Most useful next step?", [["a", "Wait silently"], ["b", "Send a specific request and date, check with owner, and flag schedule impact"], ["c", "Invent the information"], ["d", "Mark complete"]], "b"),

  choice("CR-01", 3, "pattern", "Which number continues 1, 4, 9, 16, …?", [["a", "20"], ["b", "24"], ["c", "25"], ["d", "32"]], "c"),
  choice("CR-02", 3, "normal", "A demo today needs a working component, not a finished appearance. Component A is delayed; compatible B is available with simpler finish. Best response?", [["a", "Use B for the functional demo and disclose the limitation"], ["b", "Wait for A and cancel"], ["c", "Call B the finished design"], ["d", "Cancel without checking options"]], "a"),
  choice("CR-03", 3, "normal", "Tracking is stable; conversion drop is concentrated on pages updated last week. Best first investigation?", [["a", "Compare changed pages with similar unchanged pages and inspect changes"], ["b", "Revert every site change this month"], ["c", "Increase traffic"], ["d", "Use one colleague's preference as cause"]], "a"),
  choice("CR-04", 3, "pattern", "Find the next number: 2, 6, 12, 20, 30, …", [["a", "36"], ["b", "40"], ["c", "42"], ["d", "44"]], "c"),
  game("CR-05", 3, "TEMP DEMO GAME: Staff retype a customer phone number on two forms.", "Place verification before the pilot, and compare error rates after the pilot.", "order", [["verify", "Verify authoritative source and duplicate entry"], ["pilot", "Pilot reuse of verified field"], ["compare", "Compare entry errors before and during pilot"]], ["verify", "pilot", "compare"]),
  choice("CR-06", 3, "normal", "You need a simple change in an unfamiliar scheduling tool. Best first approach?", [["a", "Copy settings from live schedule and save"], ["b", "Check approved guide or safe test view, then verify result"], ["c", "Ask colleague to make it without checking guidance"], ["d", "Try likely live setting and reverse if wrong"]], "b"),
  choice("CR-07", 3, "pattern", "Groups: ▲, ○○, ▲▲▲, ○○○○, … Which comes next?", [["a", "○○○○○"], ["b", "▲▲▲▲▲"], ["c", "▲▲▲▲"], ["d", "○○○"]], "b"),
  choice("CR-08", 3, "normal", "A road closure changes a route plan: A takes 14 minutes, B is closed, C takes 10 minutes. Any open route meets the requirement. Best choice?", [["a", "A, fastest before closure"], ["b", "B, fastest originally"], ["c", "C, now the fastest open route"], ["d", "Cancel"]], "c"),
  choice("CR-09", 3, "normal", "A library has one unused room and wants short peer-learning sessions, but attendance is uncertain. Best low-cost first step?", [["a", "Build a permanent suite"], ["b", "Invite a small volunteer group to try one session and adapt from feedback"], ["c", "Make it mandatory weekly"], ["d", "Treat low attendance as proof staff dislike learning"]], "b"),
  choice("CR-10", 3, "normal", "A projector fails before a workshop whose goal is collaborative idea mapping. Paper and whiteboard are available. Best response?", [["a", "Cancel"], ["b", "Use whiteboard/paper and capture/share results"], ["c", "Speak through unseen slides"], ["d", "Spend the session repairing projector"]], "b"),

  choice("RA-01", 4, "normal", "Required equipment documentation is incomplete. What should happen?", [["a", "Pause approval, request evidence, and check an approved alternative"], ["b", "Approve a small order"], ["c", "Accept supplier assurance instead"], ["d", "Trial before review"]], "a"),
  game("RA-02", 4, "TEMP DEMO GAME: Three issues arrive together: a public link exposes a customer file; next week's shipment may be delayed; an internal draft has a typo.", "Rank the active customer-file exposure first. The other two issues can be in either order.", "ranking", [["exposure", "Active customer-file exposure"], ["shipment", "Possible shipment delay"], ["typo", "Typo in internal draft"]], ["exposure"]),
  choice("RA-03", 4, "pattern", "What is next: 1, 2, 4, 7, 11, …?", [["a", "14"], ["b", "15"], ["c", "16"], ["d", "18"]], "c"),
  choice("RA-04", 4, "normal", "A partner requests customer data via a personal email, needed today. Safest response?", [["a", "Verify authority, then use approved channel and minimum necessary data"], ["b", "Send after removing names without checking identifiability"], ["c", "Send full file on approved channel before checking authority"], ["d", "Ask them to resend from work email and send full file"]], "a"),
  choice("RA-05", 4, "normal", "Error rate rises from 2% to 12%; written guardrail requires rollback above 5%, and rollback is tested and safe. First action?", [["a", "Apply rollback and notify incident owner, then investigate"], ["b", "Wait until tomorrow"], ["c", "Change unrelated settings"], ["d", "Remove monitoring data"]], "a"),
  choice("RA-06", 4, "normal", "A required safety check was skipped; no injury or equipment failure is known. Responsible next step?", [["a", "Pause affected activity if safe, report, and verify equipment before resuming"], ["b", "Continue because no harm reported"], ["c", "Record it as completed on time"], ["d", "Let the employee decide alone"]], "a"),
  choice("RA-07", 4, "normal", "A project depends on one supplier with long lead time and no schedule buffer. Useful early action?", [["a", "Wait until delivery date passes"], ["b", "Confirm lead time/milestones and identify feasible contingency"], ["c", "Promise earlier date"], ["d", "Remove dependency from plan"]], "b"),
  choice("RA-08", 4, "pattern", "Which pair continues B4, D8, F12, H16, …?", [["a", "I18"], ["b", "J20"], ["c", "J18"], ["d", "K20"]], "b"),
  game("RA-09", 4, "TEMP DEMO GAME: Match two risks to their first controls.", "Match the temperature log above its safe range to quarantine/contact quality; match single-operator dependency to train/verify a backup.", "matching", [["temperature", "Temperature log exceeds safe range"], ["single-operator", "Only one employee trained for critical process"]], { temperature: "quarantine", "single-operator": "backup" }, undefined, [["quarantine", "Quarantine delivery and contact quality lead"], ["backup", "Train and verify a backup operator"]]),
  choice("RA-10", 4, "normal", "A control was introduced to reduce a known risk. At scheduled review, what is most useful?", [["a", "Check evidence it operates, reassess residual exposure, and update plan"], ["b", "Ask owner if it feels effective and close if yes"], ["c", "Add another control before checking"], ["d", "Stop recording evidence"]], "a"),

  choice("EI-01", 5, "normal", "A colleague is quiet after a difficult meeting. You want to invite conversation privately without presuming feelings and make declining easy. What say?", [["a", "Would you like to talk about the meeting? No pressure if not."], ["b", "You seemed upset; I booked time tomorrow."], ["c", "Ask teammates what happened first"], ["d", "Raise their silence in a team meeting"]], "a"),
  game("EI-02", 5, "TEMP DEMO GAME: A colleague is frustrated about a handoff.", "Plan to hear/check your summary, ask what outcome or support would help, then agree a practical next step.", "order", [["listen", "Hear their account and check your summary"], ["ask", "Ask what outcome or support would help"], ["agree", "Agree a practical next step together"]], ["listen", "ask", "agree"]),
  choice("EI-03", 5, "normal", "Comments say: “The update arrived late”; “The schedule changed without notice”; “Please tell us sooner next time.” What repeated concern is explicit?", [["a", "Reliability of schedule"], ["b", "Timeliness of communication"], ["c", "Service cost"], ["d", "Continuity of account contact"]], "b"),
  choice("EI-04", 5, "normal", "Two colleagues disagree about a shared task due tomorrow. You can facilitate but cannot set priority. Best first step?", [["a", "Restate shared deadline, hear dependencies, compare evidence"], ["b", "Collect separate accounts and delay discussion"], ["c", "Choose the shorter estimate"], ["d", "Escalate without clarifying blocker"]], "a"),
  choice("EI-05", 5, "normal", "You observed a colleague miss a handoff; they asked for private feedback. Best response?", [["a", "Send generic process reminder"], ["b", "Describe specific missed handoff and impact, then invite their perspective"], ["c", "Ask manager to give feedback instead"], ["d", "Wait for another example"]], "b"),
  choice("EI-06", 5, "normal", "You feel irritated and are about to reply sharply. Constructive next step?", [["a", "Send immediately"], ["b", "Pause, identify what drives the reaction, and respond constructively"], ["c", "Assume intent to upset you"], ["d", "End the relationship"]], "b"),
  choice("EI-07", 5, "pattern", "A turn-taking cycle repeats: listen, summarise, ask, listen, summarise, ____. What completes it?", [["a", "Advise"], ["b", "Ask"], ["c", "Summarise"], ["d", "End"]], "b"),
  game("EI-08", 5, "TEMP DEMO GAME: A colleague repeatedly presents joint work without mentioning your contribution.", "Plan: describe one specific example and impact, ask/hear their perspective, then agree how both contributions will be credited next time.", "order", [["example", "Describe a specific example and its work impact"], ["hear", "Ask for and hear their perspective"], ["agree", "Agree how both contributions will be credited"]], ["example", "hear", "agree"]),
  choice("EI-09", 5, "normal", "A teammate says a decision made their workload difficult. You may adjust sequencing but cannot reverse it. Most useful response?", [["a", "Acknowledge impact and ask support, but do not discuss options"], ["b", "Acknowledge impact, explain rationale, ask which issue matters most, explore sequencing within your authority"], ["c", "Promise reversal"], ["d", "Send policy and leave them to identify options"]], "b"),
  choice("EI-10", 5, "normal", "A remote colleague asks for key decisions in writing for later review. You usually summarise verbally. Best response?", [["a", "Agree concise written decisions and ask what is useful, keeping verbal discussion available"], ["b", "Continue verbal-only"], ["c", "Send every chat and transcript"], ["d", "Ask manager before discussing it"]], "a"),
];

export function getPublicDemoQuestion(question: DemoQuestion) {
  return {
    id: question.id,
    round: question.round,
    roundTitle: question.roundTitle,
    format: question.format,
    text: question.text,
    ...(question.options ? { options: question.options } : {}),
    ...(question.game ? { game: question.game } : {}),
  };
}

export function demoBankQuestion(questionId: string) {
  return demoQuestions.find((question) => question.id === questionId);
}

export function scoreDemoResponse(
  question: DemoQuestion,
  response: unknown,
): boolean {
  if (question.id === "CA-03") {
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return false;
    }
    const allocation = response as Record<string, unknown>;
    return (
      (allocation.backlog === 6 &&
        allocation.pilot === 3 &&
        allocation.reserve === 1) ||
      (allocation.backlog === 5 &&
        allocation.pilot === 3 &&
        allocation.reserve === 2)
    );
  }
  if (typeof question.key === "string") {
    return typeof response === "string" && response === question.key;
  }
  if (Array.isArray(question.key)) {
    if (!isStringArray(response)) {
      return false;
    }
    if (question.id === "RA-02") {
      return response[0] === "exposure";
    }
    if (question.id === "PE-05") {
      const positions = new Map(response.map((id, index) => [id, index]));
      return positions.get("alert") === 0 &&
        (positions.get("save") ?? -1) < (positions.get("confirm") ?? -1) &&
        (positions.get("confirm") ?? -1) < (positions.get("notify") ?? -1);
    }
    if (question.id === "CR-05") {
      const positions = new Map(response.map((id, index) => [id, index]));
      return (positions.get("verify") ?? -1) < (positions.get("pilot") ?? -1) &&
        (positions.get("pilot") ?? -1) < (positions.get("compare") ?? -1);
    }
    const expectedKey = question.key;
    if (!isStringArray(expectedKey) || response.length !== expectedKey.length) {
      return false;
    }
    return response.every((item, index) => item === expectedKey[index]);
  }
  if (
    typeof response !== "object" ||
    response === null ||
    Array.isArray(response)
  ) {
    return false;
  }
  const candidate = response as Record<string, unknown>;
  const keyEntries = Object.entries(question.key);
  return (
    keyEntries.every(([key, value]) => {
      if (Array.isArray(value)) {
        const candidateValue = candidate[key];
        return Array.isArray(candidateValue) &&
          candidateValue.length === value.length &&
          candidateValue.every((item, index) => item === value[index]);
      }
      return candidate[key] === value;
    }) &&
    Object.keys(candidate).length === keyEntries.length
  );
}

export function getDemoResponseValidationError(
  question: DemoQuestion,
  response: unknown,
): string | null {
  if (question.format !== "game") {
    return typeof response === "string" &&
      Boolean(question.options?.some((option) => option.id === response))
      ? null
      : "Choose one of the listed answer options.";
  }

  if (question.game?.type === "allocation") {
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return "Enter a whole-number token amount for each area.";
    }
    const candidate = response as Record<string, unknown>;
    const itemIds = question.game.items.map((item) => item.id);
    if (
      Object.keys(candidate).length !== itemIds.length ||
      !itemIds.every((id) => (
        typeof candidate[id] === "number" &&
        Number.isInteger(candidate[id]) &&
        candidate[id] >= 0 &&
        candidate[id] <= 10
      ))
    ) {
      return "Enter a whole-number amount from 0 to 10 for each area.";
    }
    return null;
  }
  if (question.game?.type === "matching") {
    if (typeof response !== "object" || response === null || Array.isArray(response)) {
      return "Choose a control for each risk before saving.";
    }
    const candidate = response as Record<string, unknown>;
    const itemIds = question.game.items.map((item) => item.id);
    const matchIds = new Set(question.game.matches?.map((match) => match.id) ?? []);
    if (
      Object.keys(candidate).length !== itemIds.length ||
      !itemIds.every((id) => typeof candidate[id] === "string" && matchIds.has(candidate[id] as string))
    ) {
      return "Choose one of the listed controls for each risk before saving.";
    }
    return null;
  }
  if (question.game?.type === "priority" || question.game?.type === "ranking") {
    if (!isStringArray(response)) {
      return "Arrange every item in the list before saving.";
    }
    const expectedIds = question.game.items.map((item) => item.id);
    return response.length === expectedIds.length &&
      new Set(response).size === response.length &&
      expectedIds.every((id) => response.includes(id))
      ? null
      : "Arrange every item in the list exactly once before saving.";
  }
  if (question.game?.type === "order") {
    if (question.id === "PE-02") {
      if (typeof response !== "object" || response === null || Array.isArray(response)) {
        return "Arrange the required tasks and review the optional task selection.";
      }
      const candidate = response as Record<string, unknown>;
      const order = candidate.order;
      const itemIds = question.game.items.map((item) => item.id);
      const extraItemId = question.game.extraItem?.id;
      const excluded = candidate.excluded;
      const validOrder =
        isStringArray(order) &&
        order.length === itemIds.length &&
        new Set(order).size === order.length &&
        itemIds.every((id) => order.includes(id));
      const validExcluded =
        extraItemId !== undefined &&
        isStringArray(excluded) &&
        excluded.length <= 1 &&
        excluded.every((id) => id === extraItemId);
      return Object.keys(candidate).length === 2 && validOrder && validExcluded
        ? null
        : "Arrange each required task once; the optional task may be included or excluded.";
    }
    if (!isStringArray(response)) {
      return "Arrange every task in the list before saving.";
    }
    const expectedIds = question.game.items.map((item) => item.id);
    return response.length === expectedIds.length &&
      new Set(response).size === response.length &&
      expectedIds.every((id) => response.includes(id))
      ? null
      : "Arrange every task in the list exactly once before saving.";
  }
  return "This answer format is unavailable. Return to the question and try again.";
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
    const roundQuestions = demoQuestions.filter((question) => question.round === round);
    const correct = roundQuestions.reduce((count, question) => (
      count + (scoreDemoResponse(question, responses.get(question.id)) ? 1 : 0)
    ), 0);
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
  if (
    demoQuestions.length !== 50 ||
    ids.size !== 50 ||
    ![1, 2, 3, 4, 5].every(
      (round) => demoQuestions.filter((question) => question.round === round).length === 10,
    )
  ) {
    throw new Error("Previous assessment question set failed its structural checks.");
  }
}
