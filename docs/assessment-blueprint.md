# Mustarred Talent Assessment Blueprint

**Status:** Internal draft for product, subject-matter, accessibility, and
usability review. None of the questions or scoring rules in this document are
implemented in the application or validated for hiring use.

**Purpose:** Specify a proposed 50-item assessment before implementing scored
questions, a timer, persistence, or results.

## 1. Assessment rules

| Rule | Proposed specification |
| --- | --- |
| Total scored items | Exactly 50 questions. |
| Rounds | Five rounds, with exactly 10 scored questions in each. |
| Overall time | 20 minutes (1,200 seconds) for the complete assessment, including initial instructions and round transitions. |
| Item weight | One point for each correctly completed question. No partial credit. |
| Pass rule | 40–50 correct out of 50 = PASS (80% or higher); 0–39 = FAIL. This is a mechanical result under the requested rule, not evidence of job suitability. |
| Round results | Record each round's raw score from 0–10 and percentage. Round scores do not create additional pass requirements. |
| Candidate results | After final submission, show the total raw score, percentage, pass/fail result, and all five round scores. Do not show item answer keys. |
| Unanswered items | Count as zero after final submission or expiry. Record unanswered items separately. |
| Scenario items | One point only for the pre-specified strongest response to the stated facts. The key is a draft decision rubric, not an objective measure of personality or character. |
| Interactive mini-games | Each mini-game is one question and worth at most one point. Award the point only for the exact, defined terminal outcome; no partial credit in this initial model. |

The 80% threshold and these rules are product requirements supplied for this
draft. They have not been validated against job performance, role requirements,
or candidate outcomes. PASS/FAIL must not be presented as a scientifically
validated ability, IQ, personality, or emotional-intelligence result.

### Round definitions

1. **Commercial awareness:** business understanding, practical judgment,
   customer needs, and commercial decisions.
2. **Personality and execution:** initiative, persistence, ownership, ambition,
   and getting work done, assessed only through contextualised workplace
   decisions rather than trait labels or socially desirable self-description.
3. **Creativity and adaptability:** problem-solving, pattern recognition,
   learning, and responding to unfamiliar situations.
4. **Risk awareness:** identifying risks, weighing trade-offs, making
   responsible decisions, and managing uncertainty.
5. **Emotional intelligence:** empathy, communication, conflict resolution,
   self-awareness, and responding appropriately to other people.

## 2. Proposed question-format distribution

Codes: **G** = interactive mini-game; **N** = normal multiple-choice question or
workplace/business scenario; **P** = pattern recognition or logical reasoning.
Every round includes all three formats. This deliberately avoids treating any
one interaction type as a proxy for a whole area.

| Round | Interactive mini-games (G) | Normal questions (N) | Pattern / logic (P) | Total |
| --- | ---: | ---: | ---: | ---: |
| 1. Commercial awareness | 2 | 6 | 2 | 10 |
| 2. Personality and execution | 3 | 5 | 2 | 10 |
| 3. Creativity and adaptability | 1 | 6 | 3 | 10 |
| 4. Risk awareness | 2 | 6 | 2 | 10 |
| 5. Emotional intelligence | 2 | 7 | 1 | 10 |
| **Total** | **10** | **30** | **10** | **50** |

**Why these formats fit**

- **Round 1:** normal items assess concrete commercial choices and simple
  calculations; token allocation makes constrained resource use observable;
  the priority-board game tests ordering by explicitly stated business
  constraints. Short numeric sequences are general reasoning, not evidence of
  commercial capability.
- **Round 2:** work scenarios assess decisions about follow-through and
  ownership without asking candidates to self-label; games simulate task
  sequencing and replanning; patterns assess logic only, not personality.
- **Round 3:** pattern items directly test a discoverable rule; a process-card
  game tests whether a candidate respects prerequisite and verification steps;
  normal items assess adaptation and investigation. Static route and
  constraint-choice scenarios are classified as normal questions, not games.
- **Round 4:** scenarios assess proportionate controls; card triage and
  risk-control matching make prioritisation and control selection interactive;
  patterns are general reasoning checks, not measures of risk appetite.
- **Round 5:** normal workplace situations are the clearest way to explore
  communication choices; games exercise short conversation/facilitation
  sequences; the pattern item checks rule discovery only and is not evidence of
  interpersonal skill or anyone's inner state. EI-03 is a verbal feedback
  theme-classification task, not a sequence or rule-discovery item under the
  stated pattern definition, so it is classified as a normal question.

**Interaction convention:** A game requires an action beyond choosing one
answer from a list (for example, allocating a fixed number of tokens, placing
cards under constraints, or matching risks to controls). State the task, action
controls, completion condition, and scoring rule before implementation. Each
game below specifies a keyboard-operable alternative to pointer/touch input;
these are required design details, not implemented mechanics. Score one point
for meeting the stated constraints; where steps may validly occur in either
order, accept every order that satisfies the specified dependencies. Do not
require dragging, animation timing, precision tapping, or specialist
knowledge. A scenario that does not need an actual interaction is a normal
question, not a game.

## 3. Timing and fairness assessment

The 20-minute overall limit is 24 seconds per question when divided evenly.
This proposed budget allocates 21 seconds per scored item on average and
reserves 2:30 for instructions and transitions. This remains a strict design
constraint, not evidence that all 50 items can be completed thoughtfully in
that time. The following is a proposed budget to fit 20 minutes:

| Format | Items | Proposed item time each | Item-time subtotal |
| --- | ---: | ---: | ---: |
| Interactive mini-games | 10 | 30 seconds | 5 min 00 sec |
| Normal questions | 30 | 20 seconds | 10 min 00 sec |
| Pattern / logic | 10 | 15 seconds | 2 min 30 sec |
| **Scored items** | **50** | **21 seconds average** | **17 min 30 sec** |
| Initial instructions and four round transitions | — | — | 2 min 30 sec |
| **Total** | **50** | — | **20 min 00 sec** |

The 2:30 allowance is only about 1:30 for initial instructions and 15 seconds
for each of four transitions. It leaves no separate break time. The proposed
normal questions and patterns must be short, familiar in interaction, and
legible on small screens. Mini-games need short instructions, a single clear
objective, and few low-complexity actions. Items that require multi-step
calculations, lengthy reading, complex controls, or nuanced reflection are not
suitable for this budget without being shortened, moved to an untimed practice,
or obtaining approval to change the overall time.

Every item's proposed time is stated in the bank below. The 30-second game
budget includes reading the task, learning the action, and completing it.
PE-02 and RA-09 have been simplified to reduce interaction steps, but their
30-second limits remain unverified. Matching and card-ordering tasks remain
particularly uncertain and may not fit. These are design budgets, not measured
completion times. Timed testing must confirm that candidates can understand
and operate each game without hurried guessing. The time pressure is a material
fairness and validity risk, particularly for reading, language proficiency,
assistive technology, motor access, and candidates who need accommodations.
The keyboard alternatives specified in the question bank are design
requirements only; none has been implemented or verified with keyboard-only or
screen-reader use.
Before actual recruitment use, complete timed usability testing, mobile testing,
and accessibility testing with assistive technology, and approve an
accommodation policy (including time adjustments). Do not assume that everyone
can reasonably finish 50 items in 20 minutes. The fixed 20-minute requirement
may need reconsideration if testing shows that the candidate experience is not
usable or fair.

## 4. Draft question bank — internal review only

All 50 items below are **drafts requiring review and validation before
production**. Keep this answer key and scoring rationale out of client code,
public routes, and candidate responses. “Difficulty” is an informal authoring
estimate, not a calibrated item statistic.

**Scoring key:** Objective items have a uniquely specified correct answer.
Scenario items have one proposed strongest response under the stated facts;
the rationale should be reviewed by relevant subject-matter experts and tested
for ambiguity and bias. Every item earns 1 or 0 only.

### Round 1 — Commercial awareness

| ID | Format / time | Draft question and options | Key and explanation / scenario rationale | Difficulty; skill |
| --- | --- | --- | --- | --- |
| CA-01 | N · 20 sec · objective | A product sells for £48 and has a variable cost of £31 per unit. What is its contribution per unit before fixed costs? **A.** £13 **B.** £17 **C.** £31 **D.** £79 | **B.** £48 − £31 = £17. Contribution is revenue less variable cost, before fixed costs. | Easy; contribution and basic commercial arithmetic. |
| CA-02 | P · 15 sec · objective | Monthly enquiries were 120, 145, 170, and 195. If the same pattern continues, what is next? **A.** 205 **B.** 215 **C.** 220 **D.** 240 | **C. 220.** The sequence increases by 25 each month. | Easy; identify a constant difference. |
| CA-03 | G · 30 sec · scenario | **Resource-allocation game.** A team has 10 one-unit tokens. The agreed minimums are 5 for the urgent customer backlog, 3 for a pilot, and 1 for contingency reserve, leaving one token to allocate. The pilot is fully viable at 3. The business owner considers one additional urgent case and one additional reserve unit equally important for this exercise. Choose where the final token goes: “customer backlog” or “contingency reserve.” | **Two acceptable allocations:** backlog 6, pilot 3, reserve 1; or backlog 5, pilot 3, reserve 2. Completion: select either destination for the single remaining token and submit. Award one point for either stated allocation; otherwise zero. There is no partial credit, and neither option is ranked above the other. Keyboard alternative: Tab to one of two labelled radio options, choose with arrow keys, and submit with Enter/Space. | Medium; make a constrained allocation trade-off between immediate customer service and contingency capacity. |
| CA-04 | N · 20 sec · scenario | A possible delivery delay has been flagged for orders due today. Policy requires prompt notice to affected customers, but does not allow unconfirmed delivery promises. What is the best response? **A.** Check which orders are affected and the current carrier status, then send those customers a concise update with verified facts and a time for the next update **B.** Ask the carrier for an ETA and wait to contact customers until it is confirmed **C.** Send a blanket discount to all customers before checking which orders are affected **D.** Promise the most likely new delivery date so customers can plan | **A.** It follows the stated notification policy, checks scope, and avoids unsupported promises. | Easy; customer communication under uncertainty. |
| CA-05 | G · 30 sec · scenario | **Priority-board game.** It is 10:00. Prioritise work for the next 15-minute window by placing two cards in order and one in “Defer”: begin the agreed 10-minute containment work for a checkout outage currently preventing purchases; prepare and send an invoice due at 10:15 (5 minutes; if late, payment moves to the next monthly cycle); polish slides for a presentation next week (15 minutes). | This is a prioritisation simulation only: do not perform or claim to complete the work. The two selected tasks total exactly 15 minutes; slide polish is deferred. Completion: all three cards are placed. Award one point only for outage containment first, invoice second, slides deferred; otherwise zero. The key prioritises stopping ongoing lost purchases while meeting the hard invoice cutoff; it does not imply completing more than 15 minutes of work. Use labelled move-up/down and defer controls. Keyboard alternative: Tab to a card, use Enter/Space and arrow keys to move it or place it in Defer, then activate Submit. | Medium; weigh ongoing customer/revenue impact against a fixed payment deadline. |
| CA-06 | N · 20 sec · scenario | A new market looks promising, but local demand and delivery costs are uncertain. What is the most useful first test? **A.** Ask a local distributor for a forecast, then use it as the launch-volume estimate **B.** Run a small test that measures local demand and delivery cost against an agreed success measure **C.** Survey likely customers about interest, then decide without estimating fulfilment costs **D.** Use domestic margins to set a target and defer local research until after launch | **B.** It checks both demand and a material cost; the forecast or survey alone leaves one of the stated uncertainties unresolved. | Easy; validate commercial opportunity and unit economics. |
| CA-07 | N · 20 sec · objective | At £25 each, 80 units generate £2,000 revenue. At £20 each, 90 units would generate: **A.** £1,600 **B.** £1,800 **C.** £2,000 **D.** £2,250 | **B.** £20 × 90 = £1,800. The lower price and stated volume do not increase revenue; costs are not provided, so profit cannot be inferred. | Easy; calculate revenue and distinguish it from profit. |
| CA-08 | N · 20 sec · scenario | A competitor cuts its listed price. Your customers differ in price sensitivity, and your margin varies by product. What is the best first analysis? **A.** Compare affected customer segments, reasons for buying, and margin impact before choosing a targeted response **B.** Match the cut across all products for one week, then compare sales volume **C.** Protect the current price everywhere until customers complain **D.** Stop the lowest-margin product immediately | **A.** It checks which customers and products are affected and the economics of possible responses before committing to a blanket change. | Medium; segment customer needs and assess margin trade-offs. |
| CA-09 | P · 15 sec · objective | A weekly sales index is 4, 8, 16, 32, … What is next? **A.** 36 **B.** 48 **C.** 64 **D.** 96 | **C. 64.** Each value doubles. | Easy; identify a multiplicative pattern. |
| CA-10 | N · 20 sec · objective | Campaign A has £12,000 revenue and £7,000 variable cost. Campaign B has £10,000 revenue and £4,000 variable cost. Which has higher contribution before fixed costs? **A.** A by £1,000 **B.** B by £1,000 **C.** They are equal **D.** Cannot compare contribution from these figures | **B.** A contributes £5,000; B contributes £6,000. | Medium; compare contribution rather than revenue alone. |

### Round 2 — Personality and execution

These items assess choices in a specific work situation. They do **not** establish
a stable personality trait, ambition, integrity, or moral worth.

| ID | Format / time | Draft question and options | Key and explanation / scenario rationale | Difficulty; skill |
| --- | --- | --- | --- | --- |
| PE-01 | N · 20 sec · scenario | You own a task that is likely to miss its agreed deadline because a dependency is late. What is the most effective next step? **A.** Tell the requester early that the dependency is late, then wait for a new date before suggesting a plan **B.** Explain the blocker promptly, give the best current estimate, and propose a realistic recovery option while asking the dependency owner for an update **C.** Continue working on unaffected parts and update the requester only when the new date is certain **D.** Reduce the review step to preserve the original date without first checking the quality risk | **B.** It gives timely status, identifies uncertainty, and makes a recovery proposal without concealing a quality trade-off. This scores the response in this context, not a personality trait. | Medium; communicate blockers and follow through. |
| PE-02 | G · 30 sec · scenario | **Task-sequencing game.** A weekly report is due in 20 minutes. Put these three required task cards in order: verify figures (5 min), draft report (8 min), peer-check (5 min). Mark “polish cover page (15 min)” as optional and not needed for the deadline. | This is a planning interaction; candidates do not perform the 18 minutes of work. Completion: order all three required cards and mark the optional card excluded. Award one point only for verify → draft → peer-check and exclusion of polish; otherwise zero. Keyboard alternative: use labelled move-up/down buttons for required cards, a labelled include/exclude toggle for polish, and Submit; all controls operate by Tab and Enter/Space. | Medium; organise dependent work and protect a quality check. |
| PE-03 | P · 15 sec · objective | Completed tasks over five weeks were 2, 4, 7, 11, 16, … If the pattern continues, what is next? **A.** 20 **B.** 21 **C.** 22 **D.** 24 | **C. 22.** Differences are +2, +3, +4, +5, then +6. | Easy; incremental sequence reasoning, not a measure of execution. |
| PE-04 | N · 20 sec · scenario | Two requesters want different deliverables by the same time, but you have capacity for only one. What should you do first? **A.** Start the task with the earlier written request, then tell the other requester about the conflict **B.** Compare the deadlines and business impact with both requesters, agree the priority, and state what can realistically be delivered **C.** Split your time evenly between both tasks before checking whether partial work is useful **D.** Ask your manager to decide, without first giving them the deadlines or impact | **B.** It makes the trade-off explicit and enables a priority decision based on relevant information rather than arrival order or guesswork. | Medium; prioritisation and expectation management. |
| PE-05 | G · 30 sec · scenario | **Replanning board.** You are drafting a routine update when a verified customer-facing outage is reported. Arrange these four available action cards: (1) alert the incident owner; (2) save a note of the draft's current state; (3) confirm the new priority with your manager; (4) notify the requester of a revised ETA. The incident owner handles the outage; you do not need to resume the draft in this game. | Completion: place all four cards in order. Award one point only if alerting the incident owner precedes the remaining actions, saving the draft note precedes the priority-confirmation discussion, and that discussion precedes notifying the requester; any order satisfying all three dependencies scores. Otherwise zero. Keyboard alternative: labelled move-up/down buttons and Submit, operable using Tab and Enter/Space. | Medium; replan work, preserve progress, and set expectations. |
| PE-06 | N · 20 sec · scenario | After sending a report, you discover that one figure is wrong. What is the best response? **A.** Tell the report owner or recipients promptly, verify the correct figure, and send a clearly marked correction **B.** Hope nobody notices **C.** Delete the shared report without explanation **D.** Blame the source data before checking it | **A.** Contain the impact, check the facts, and make the correction traceable. | Easy; ownership and correction of an error. |
| PE-07 | N · 20 sec · scenario | Your manager suggests a stretch goal, but the team's capacity is uncertain. How can you make progress responsibly? **A.** Promise the full goal without checking dependencies **B.** Reject it because it is challenging **C.** Clarify the desired outcome, identify capacity and dependencies, and agree a measurable first milestone **D.** Reduce quality checks to protect the date | **C.** Translate ambition into an evidence-based milestone and surface constraints early. | Medium; goal-setting and realistic execution. |
| PE-08 | P · 15 sec · objective | A weekly output index is 5, 9, 14, 20, 27, … What is next? **A.** 33 **B.** 34 **C.** 35 **D.** 36 | **C. 35.** Differences are +4, +5, +6, +7, then +8. | Medium; increasing-difference sequence reasoning, not a measure of persistence. |
| PE-09 | G · 30 sec · scenario | **Handoff-sequencing game.** A handoff is due in 20 minutes. Place these action cards in three numbered slots: confirm a missing customer quantity with the requester (2 min); check the draft against that quantity (8 min); send the checked handoff (2 min). Formatting is not required. | Completion: all three cards occupy the numbered slots. Award one point only for confirm quantity → check draft → send handoff; otherwise zero. The rule explicitly requires checking before sending. This plans the work; candidates do not perform the 12 minutes of work. Keyboard alternative: Tab to a card and use labelled move-up/down buttons, then Submit with Enter/Space. | Medium; identify dependencies and protect a required handoff. |
| PE-10 | N · 20 sec · scenario | Your task is blocked by an input another team has not supplied. What is the most useful next step? **A.** Wait silently until the deadline **B.** Send a specific request with the needed item and date, check with the dependency owner, and flag schedule impact if it remains blocked **C.** Invent the missing information **D.** Mark the work complete | **B.** Make the dependency actionable and communicate the risk without fabricating progress. | Easy; initiative on dependencies and truthful status. |

### Round 3 — Creativity and adaptability

| ID | Format / time | Draft question and options | Key and explanation / scenario rationale | Difficulty; skill |
| --- | --- | --- | --- | --- |
| CR-01 | P · 15 sec · objective | Which number continues the sequence 1, 4, 9, 16, …? **A.** 20 **B.** 24 **C.** 25 **D.** 32 | **C. 25.** The terms are consecutive squares: 1², 2², 3², 4², then 5². | Easy; recognise a square-number pattern. |
| CR-02 | N · 20 sec · scenario | A demo today requires a working component, not a finished appearance. Component A is delayed three days. Component B is compatible and available now, but has a simpler finish. What is the best response? **A.** Use B for today's functional demo and tell attendees about the finish limitation **B.** Wait for A and cancel today's demo **C.** Use B but describe it as the final finished design **D.** Cancel the demo without checking whether function can be demonstrated | **A.** It meets the explicitly stated need while accurately disclosing the limitation. | Medium; adapt to changed constraints and communicate trade-offs. |
| CR-03 | N · 20 sec · scenario | Analytics tracking is confirmed stable, and this week's conversion drop is concentrated on pages updated last week. What is the best first investigation? **A.** Compare the changed pages with similar unchanged pages and inspect the specific changes before choosing a fix **B.** Revert every site change from the past month, including unrelated updates **C.** Increase traffic to the affected pages to see if the rate returns to normal **D.** Ask one colleague which new design they prefer and use that preference as the explanation | **A.** It uses the observed concentration and a relevant comparison without changing unrelated factors or treating opinion as evidence. | Medium; investigate a signal and narrow possible causes. |
| CR-04 | P · 15 sec · objective | Find the next number: 2, 6, 12, 20, 30, … **A.** 36 **B.** 40 **C.** 42 **D.** 44 | **C. 42.** Differences are +4, +6, +8, +10, then +12. | Medium; infer an increasing-difference rule. |
| CR-05 | G · 30 sec · scenario | **Process-redesign board.** Staff retype a customer phone number on two forms. Arrange three action cards: verify which form is the authoritative source and where the duplicate occurs; pilot reusing that verified field; compare entry errors before and during the pilot before wider rollout. | Completion: place all three cards in the workflow. Award one point only if verification precedes the pilot and error comparison follows it; otherwise zero. This accepts every ordering that satisfies these dependencies. Keyboard alternative: select cards and use labelled move-up/down buttons, then Submit with Enter/Space. | Medium; validate an assumption and evaluate a small process change. |
| CR-06 | N · 20 sec · scenario | You need to make a simple change in an unfamiliar scheduling tool. Which first approach best limits avoidable disruption while helping you learn? **A.** Copy settings from a similar live schedule and save before checking the effect **B.** Check the approved quick guide or a safe test view, then verify the result **C.** Ask a colleague to make the change while you observe, without first checking whether guidance is available **D.** Try the most likely setting in the live schedule and reverse it if the result looks wrong | **B.** It uses a low-risk learning route and verifies the outcome before changing live work. | Easy; learn safely in an unfamiliar situation. |
| CR-07 | P · 15 sec · objective | Groups follow a pattern: one triangle (▲), two circles (○○), three triangles (▲▲▲), four circles (○○○○), … Which group comes next? **A.** five circles (○○○○○) **B.** five triangles (▲▲▲▲▲) **C.** four triangles (▲▲▲▲) **D.** three circles (○○○) | **B.** The group size increases by one and alternates triangle, circle; the fifth group is five triangles. Provide text labels for the symbols in the accessible presentation. | Medium; discover a two-rule visual/text sequence. |
| CR-08 | N · 20 sec · scenario | A route plan changes after a road closure: Route A now takes 14 minutes, Route B is closed, and Route C takes 10 minutes. Any open route meets the delivery requirement. What is the best choice? **A.** Route A because it was fastest before the closure **B.** Route B because it was fastest in the original plan **C.** Route C because it is now the fastest open route **D.** Cancel without checking the updated options | **C.** Route C is open and takes less time than A; B is closed. | Easy; update a decision using changed information. |
| CR-09 | N · 20 sec · scenario | A library has one unused room and wants to encourage short peer-learning sessions, but attendance is uncertain. Which low-cost first step best explores the idea? **A.** Build a permanent training suite before asking potential users **B.** Invite a small volunteer group to try one short session, ask what helped, and use that feedback to adapt the next trial **C.** Announce a mandatory weekly programme for all staff **D.** Decide in advance that low attendance would prove staff are not interested in learning | **B.** A small, reversible trial gathers user feedback without overcommitting or treating one result as definitive. | Medium; generate and test a practical idea under uncertainty. |
| CR-10 | N · 20 sec · scenario | A projector fails before an eight-person workshop. The goal is to map ideas collaboratively; paper and a whiteboard are available. What is the most useful response? **A.** Cancel immediately **B.** Use the whiteboard and paper to map ideas, then capture and share the result **C.** Continue speaking through slides nobody can see **D.** Spend the session trying to repair the projector | **B.** Preserve the workshop's purpose with available tools and make its output shareable. | Easy; find an alternative while maintaining the goal. |

### Round 4 — Risk awareness

| ID | Format / time | Draft question and options | Key and explanation / scenario rationale | Difficulty; skill |
| --- | --- | --- | --- | --- |
| RA-01 | N · 20 sec · scenario | A supplier's equipment documentation is incomplete; the missing document is required by your organisation before the equipment is approved. What should you do? **A.** Pause approval, ask the supplier for the specified evidence, and check an approved alternative if it cannot be provided **B.** Approve a small initial order while the supplier completes the paperwork **C.** Ask the supplier to confirm in writing that the equipment meets the requirement, then approve it **D.** Proceed for a limited trial and complete the documentation review before wider use | **A.** The stated requirement is a prerequisite to approval; a supplier assurance or limited use does not replace the missing evidence. | Easy; apply a defined approval control. |
| RA-02 | G · 30 sec · scenario | **Risk-triage board.** Three issue cards arrive at once: a public link is currently exposing a customer file; a supplier warns that next week's shipment may be delayed; a typo is in an internal draft not yet circulated. Place all three in priority order. The data exposure is the only issue requiring immediate containment; the other two can be handled afterward in either order. | Completion: all three cards occupy ranked positions. Award one point only if the active customer-file exposure is first; accept either order for the supplier warning and draft typo. Otherwise zero. Keyboard alternative: Tab to a card and use labelled move-up/down buttons, then Submit with Enter/Space. | Medium; distinguish an active exposure from contained, lower-immediacy issues. |
| RA-03 | P · 15 sec · objective | What is next in the sequence 1, 2, 4, 7, 11, …? **A.** 14 **B.** 15 **C.** 16 **D.** 18 | **C. 16.** Differences are +1, +2, +3, +4, then +5. | Easy; identify an increasing-difference pattern. |
| RA-04 | N · 20 sec · scenario | A partner asks for a customer data file through a personal email account, saying it is needed today. What is the safest first response? **A.** Confirm the partner is authorised, then use the approved secure channel and share only the data needed **B.** Send the file to the personal account after removing names, without checking whether the remaining fields identify customers **C.** Send the full file through the approved channel before confirming that the partner is authorised **D.** Ask the partner to forward the request from a work account, then send the full file | **A.** It verifies authority, uses the approved channel, and limits disclosure; urgency or a work email address alone does not establish permission. | Medium; assess authority, channel, and data minimisation. |
| RA-05 | N · 20 sec · scenario | A release raises the error rate from 2% to 12%. The written guardrail says to investigate and roll back above 5%; the rollback has been tested and is safe. What should you do first? **A.** Apply the agreed rollback and notify the incident owner, then investigate **B.** Wait until tomorrow to see whether the error rate falls **C.** Change several unrelated settings to test possible causes **D.** Remove the monitoring data to avoid alarming stakeholders | **A.** It follows the pre-agreed safe guardrail and reduces active impact before investigation. | Medium; use a defined control and contain operational impact. |
| RA-06 | N · 20 sec · scenario | A team member reports that a required safety check was skipped, but no injury or equipment failure is known. What is the most responsible next step? **A.** Stop the affected activity if safe, report the missed check through the established process, and verify the equipment before resuming **B.** Continue because no harm has been reported **C.** Quietly complete the record as if the check happened on time **D.** Ask the team member to decide alone whether the check mattered | **A.** It contains potential exposure, preserves an accurate record, and uses the appropriate verification process without assuming harm occurred. | Medium; respond proportionately to a safety-control failure. |
| RA-07 | N · 20 sec · scenario | A project depends on one supplier with a long lead time and no schedule buffer. What is a useful early action? **A.** Wait until the delivery date has passed **B.** Confirm the lead time and critical milestones, then identify a feasible contingency **C.** Promise an earlier date to the customer **D.** Remove the dependency from the plan | **B.** Verify the exposure while there is still time to reduce or plan for it. | Easy; identify dependency and schedule risk. |
| RA-08 | P · 15 sec · objective | Which pair continues the pattern B4, D8, F12, H16, …? **A.** I18 **B.** J20 **C.** J18 **D.** K20 | **B. J20.** Letters advance by two; numbers advance by four. | Medium; track two simultaneous sequence rules. |
| RA-09 | G · 30 sec · scenario | **Risk-and-control matching game.** Match two risks to their first controls: (i) a refrigerated delivery's temperature log exceeds its stated safe range; (ii) only one employee is trained to run a critical daily process. Controls: (a) quarantine the affected delivery and contact the quality lead before use; (b) train and verify a backup operator. | **i → a, ii → b.** Completion: make and submit both matches, using each control once. Award one point only if both are correct; otherwise zero. Keyboard alternative: Tab to each labelled risk, use arrow keys to choose a labelled control, press Enter to confirm, then activate Submit. No colour-only or drag-only interaction. | Medium; select controls matched to distinct safety and continuity risks. |
| RA-10 | N · 20 sec · scenario | A team introduced a control to reduce a known risk. What is the most useful next step at the scheduled review? **A.** Check evidence that the control is operating, reassess remaining exposure, and update the plan if needed **B.** Ask the control owner whether they believe it is effective and close the risk if they say yes **C.** Add a second control before checking whether the first works **D.** Keep the risk open but stop recording evidence so the review is quicker | **A.** It checks operation and residual risk before deciding whether further treatment is needed. | Medium; monitor controls and reassess residual risk. |

### Round 5 — Emotional intelligence

These are situational judgment drafts, not tests that establish empathy,
emotional intelligence, or a candidate's inner state. Keys reflect the stated
context only.

| ID | Format / time | Draft question and options | Key and explanation / scenario rationale | Difficulty; skill |
| --- | --- | --- | --- | --- |
| EI-01 | N · 20 sec · scenario | A colleague has been quiet after a difficult meeting. You have a private moment together before they leave. Your aim is to offer a direct invitation to talk without presuming how they feel, and to make declining easy. What should you say? **A.** “Would you like to talk about the meeting? No pressure if not.” **B.** “You seemed upset, so I have arranged time for us to discuss it tomorrow.” **C.** Ask their close teammates what happened before approaching them **D.** Raise your concern about their silence in the next team meeting | **A.** It meets all three stated conditions: private, non-presumptive, and optional. | Easy; respectful communication and boundaries. |
| EI-02 | G · 30 sec · scenario | **Conversation-planning game.** A colleague is frustrated about a handoff. Arrange three cards: hear their account and check your summary; ask what outcome or support would help; agree a practical next step together. | Completion: place all three cards in the plan. Award one point only if hearing/checking precedes the support question and the shared next step follows it; otherwise zero. This scores stated dependencies rather than a supposedly universal script. Keyboard alternative: labelled move-up/down buttons and Submit, operable with Tab and Enter/Space. | Medium; listen, check understanding, and collaborate on next steps. |
| EI-03 | N · 20 sec · objective | Three customer comments say: “The update arrived late”; “The schedule changed without notice”; “Please tell us sooner next time.” What repeated, explicitly stated concern is most evident? **A.** Reliability of the underlying schedule **B.** Timeliness of communication **C.** Cost of the service **D.** Continuity of the customer's account contact | **B.** Each comment explicitly concerns when information was communicated. The distractors are plausible adjacent service concerns, but none is stated across all three comments. This is a normal classification question, not a sequence or rule-discovery item; it does not infer emotional state. | Easy; identify a repeated theme in stated feedback. |
| EI-04 | N · 20 sec · scenario | Two colleagues disagree about a deadline for a shared task due tomorrow. You are asked to facilitate, but do not have authority to set the priority yourself. What is the most useful first step? **A.** Hold a short discussion to restate the shared deadline, hear each person's dependency, and compare the current evidence **B.** Ask each person to send a separate account and postpone discussion until next week **C.** Choose the colleague whose estimate is shorter so work can begin **D.** Refer the disagreement to a senior manager without clarifying the immediate blocker | **A.** It uses the facilitator's role, deadline, and available evidence to clarify the disagreement before deciding whether escalation is needed. | Medium; facilitate disagreement and understand different constraints. |
| EI-05 | N · 20 sec · scenario | You directly observed a colleague miss a handoff, and they have asked you to give feedback privately. What is the most useful response? **A.** Send a written reminder of the process without mentioning the specific effect this time **B.** Describe the specific missed handoff and its work impact, then invite their perspective **C.** Ask a manager to deliver the feedback even though you observed the event and were asked directly **D.** Wait for another example before discussing this one | **B.** A concrete example and impact make the feedback actionable; inviting context avoids assuming intent. | Easy; respectful, actionable feedback. |
| EI-06 | N · 20 sec · scenario | You notice that you feel irritated during a work discussion and are about to reply sharply. What is a constructive next step? **A.** Send the reply immediately **B.** Pause, identify what is driving your reaction, and respond when you can address the issue constructively **C.** Assume the other person intended to upset you **D.** End the relationship without discussion | **B.** A pause can help distinguish a reaction from the issue and make a more considered response possible. | Easy; self-awareness and emotion regulation in context. |
| EI-07 | P · 15 sec · objective | A meeting turn-taking prompt repeats this cycle: listen, summarise, ask, listen, summarise, ____. Which action completes the stated three-step cycle? **A.** Advise **B.** Ask **C.** Summarise **D.** End | **B. Ask.** The specified three-step cycle repeats in the same order. This is a simple sequence item, not evidence of emotional intelligence or actual listening behaviour. | Easy; identify a repeated verbal sequence. |
| EI-08 | G · 30 sec · scenario | **Feedback-conversation board.** A colleague repeatedly presents joint work without mentioning your contribution. Arrange three cards: describe one specific example and its work impact; ask for and hear the colleague's perspective; agree how both contributions will be credited in the next update. | Completion: place all three cards in the plan. Award one point only if the example/impact precedes the question and the agreement follows hearing the perspective; otherwise zero. Accept every order satisfying those dependencies. Keyboard alternative: labelled move-up/down buttons and Submit, operable with Tab and Enter/Space. | Medium; raise a concern without attributing intent, then agree a practical action. |
| EI-09 | N · 20 sec · scenario | A teammate says a recent decision has made their workload difficult. You know the decision's rationale and may adjust task sequencing, but cannot reverse the decision. What is the most useful response? **A.** Acknowledge the impact and ask what support would help, without explaining the decision or discussing options **B.** Acknowledge the impact, explain the relevant rationale, ask which workload issue matters most, and explore sequencing changes within your authority **C.** Promise to reverse the decision before checking with the decision-maker **D.** Send the policy document and leave the teammate to identify possible adjustments | **B.** It recognises the impact, gives relevant context, and explores only changes within the stated authority. | Medium; empathy, transparent communication, and realistic support. |
| EI-10 | N · 20 sec · scenario | A remote colleague asks for key decisions in writing so they can review them after meetings. You usually give verbal summaries. What is the most useful response? **A.** Agree to send concise written decisions and ask what information is most useful, while keeping verbal discussion available **B.** Continue verbal-only updates because they are quicker for you **C.** Send every chat message and meeting transcript without checking what they need **D.** Ask a manager to choose a format before you discuss the request with your colleague | **A.** It adapts communication to the stated need without overloading the colleague or assuming one format replaces all others. | Easy; adapt communication and check another person's stated preference. |

## 5. Scoring and reporting proposal

1. Award exactly one point when the submitted answer matches the approved
   answer key (objective items) or the approved, context-specific best response
   (scenario items); otherwise award zero. An unanswered item is zero.
2. For a mini-game, define its successful final state and all accepted
   dependency-respecting orders before implementation. The game counts as one
   item, regardless of the number of taps or cards. Do not introduce partial
   credit or extra scoring weight.
3. Calculate `overall_correct = sum(item_points)` across 50 items and
   `overall_percent = overall_correct / 50 * 100`.
4. Calculate each round as `round_correct = sum(item_points)` for that round
   (0–10) and `round_percent = round_correct / 10 * 100`. These descriptive
   breakdowns do not change the overall threshold.
5. Return `PASS` for 40 or more correct, otherwise `FAIL`. A displayed result
   should say that this is the requested assessment rule, not a validated
   hiring recommendation.
6. Keep a versioned record of the approved question set, options, answer key,
   scoring method, responses, unanswered items, timestamps, and calculated
   scores so a result can be reproduced and audited. Do not expose draft
   explanations or answer keys before finalisation.

Objective questions have one intended answer; each game has one defined
success criterion, which may accept multiple dependency-valid action orders;
scenario keys propose the strongest response under the stated facts. These are
draft hypotheses, not validated conclusions. If review finds more than one
reasonably defensible scored response, revise the item or use a rubric that
accepts the valid alternatives rather than forcing a single key.
Subject-matter review, cognitive interviews, accessibility review, and bias
review must occur before freezing a scoring key. Personality and
emotional-intelligence round scores must not be described as diagnoses,
validated traits, or stable individual characteristics.

## 6. Recommended technical implementation (future phase; not implemented)

- Keep the present landing, welcome, and instructions previews intact. Build a
  separate assessment experience only after this blueprint and the candidate
  interaction rules are approved.
- Treat the browser timer as display only. On an authorised start request, the
  server records a UTC start time and immutable deadline. Every answer,
  resume, and final-submit operation checks the server deadline. The server
  finalises expired attempts and treats repeated finalisation requests
  idempotently.
- Persist each validated answer against its attempt and stable question ID as
  the candidate progresses. Make retries safe, report network/save failures
  clearly, and recover the same attempt and original deadline after refresh or
  temporary disconnection. Do not imply that client-only state is saved.
- Serve candidate prompts and options without correct answers, internal
  scoring notes, or outcome labels. Keep the approved answer key and scoring
  function exclusively in server-side code or protected storage. Score in a
  server transaction at submission/expiry, then return only the authorised
  candidate result.
- Store the immutable question-set/version reference on each attempt. Record
  item responses, unanswered items, start/deadline/submit times, completion
  status, five round totals, total score, and pass/fail outcome. Validate that
  each version has exactly 5 rounds × 10 unique scored question IDs before
  publication.
- Enforce one attempt in the backend/database, including concurrent start
  requests. Normalised email alone cannot prevent use of another email;
  decide whether to require an invitation token, verified email, or another
  proportionate eligibility method. Avoid collecting unnecessary identity
  data.
- Use server-side authentication and least-privilege authorisation for
  recruiter data access, with database access policies and audit logging once
  a database is selected. Do not add recruiter endpoints that expose results
  without authentication and authorisation.
- Show the candidate only their finalised result after server confirmation.
  Present total score, the mechanical PASS/FAIL rule, and round breakdowns
  without exposing other candidates' records or answer keys.
- Design mini-games as responsive semantic controls (radio/select alternatives,
  labelled buttons, or keyboard-operable ordering controls), with no
  drag-only, colour-only, animation-dependent, or fine-motor scoring.
- Give every pattern symbol and visual element an equivalent text or spoken
  description; do not make glyph rendering or visual acuity the sole route to
  understanding a rule.

The current application has no database, server-side attempt logic, recruiter
authentication, or persistent question bank. Do not treat this proposal as
implemented functionality.

## 7. Outstanding decisions and approval gates

Before production question authoring or implementation, review and decide:

1. **Approve or revise this 50-item distribution and question bank.** All
   questions are drafts; specialist review and candidate testing are required.
2. **Confirm the pass threshold in its intended use.** The requested 40/50 rule
   is specified here but has no validation evidence and must not silently
   become a hiring cutoff.
3. **Agree candidate navigation:** whether candidates may skip items, move
   backwards, and change answers before final submission; the current score
   proposal treats any final unanswered item as zero.
4. **Agree accommodations and timing fairness:** permitted additional time,
   breaks, assistive-technology testing, and how equivalent access is provided
   without disadvantaging candidates.
5. **Select proportionate one-attempt identity controls:** invitation token,
   verified email, or another approved mechanism. Email-only enforcement is
   insufficient to establish identity.
6. **Approve candidate privacy, retention, and deletion terms** before
   collecting real candidate data.
7. **Select and configure a backend and recruiter authentication model** before
   implementing persistent attempts, server-enforced timing, scoring, or
   results.
8. **Approve the result presentation.** Candidates may see their total,
   mechanical pass/fail, and round scores as requested; confirm any explanatory
   text and who else can see them.

## 8. Existing implementation status

The current application uses Next.js App Router, React, and TypeScript. It has
a public landing page (`app/page.tsx`), a local-only welcome preview
(`app/start/page.tsx` and `app/start/candidate-welcome-form.tsx`), and
instructions with an unscored practice question
(`app/start/instructions/page.tsx` and
`app/start/instructions/candidate-practice.tsx`). Shared visual styling is in
`app/globals.css`. The welcome form and practice interaction do not create an
attempt or persist personal information or answers.

There is no scored question engine, production question bank, server timer,
answer persistence, one-attempt enforcement, database, server-side scoring,
candidate results page, or recruiter dashboard. This document adds a proposal
only; it does not change the candidate-facing pages or install/configure
anything.
