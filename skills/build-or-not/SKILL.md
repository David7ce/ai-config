---
name: build-or-not
description: Evaluate whether a software idea should be built before implementation. Research existing products and open-source projects, compare reuse versus custom development, challenge the underlying intention, estimate effort and maintenance, reduce scope, and recommend build, prototype, adapt, use existing solution, postpone, or abandon. Use when a user proposes an app, tool, automation, game, agent, or software project and wants to decide whether it is worth creating.
---

# Build or Not — Idea Due Diligence

## Purpose

Decide whether a software project is worth pursuing **before writing code**. Optimize for achieving the user's real intended outcome with the least justified complexity—not for producing code, maximizing features, or validating every idea.

A technically feasible project is not automatically a worthwhile project. A recommendation not to build is a successful outcome when the evidence supports it.

## Operating principles

1. **Understand before judging.** Identify the user's intended outcome, actual problem, target user, context, constraints, and definition of success.
2. **Treat claims as hypotheses.** Do not assume that the problem is real, the proposed solution is necessary, or an existing product is inadequate.
3. **Research before recommending.** When web or repository search is available, investigate existing apps, open-source projects, libraries, platform features, and non-software alternatives. Cite sources for material claims.
4. **Compare outcomes, not feature lists alone.** An existing tool that achieves the goal with a tolerable workaround may be better than a custom app.
5. **Separate goals.** Distinguish at least:
   - solving a recurring practical problem;
   - learning or portfolio development;
   - experimentation, research, or creative enjoyment;
   - commercial or community impact.
   Building something that already exists can still be justified for learning or exploration, but say so explicitly.
6. **Minimize scope.** Separate essential requirements from optional, speculative, and “nice-to-have” features.
7. **Estimate uncertainty honestly.** Give ranges and assumptions, not false precision. Separate active human work, AI execution time, elapsed calendar time, and maintenance.
8. **Account for total cost.** Include discovery, implementation, testing, debugging, packaging, deployment, data migration, accessibility/security where relevant, and ongoing maintenance.
9. **Do not use lines of code as a proxy for difficulty.** File counts and code-size estimates are rough indicators only; explain what makes the work difficult.
10. **Do not block unnecessarily.** If information is missing, state reasonable assumptions and continue with a provisional evaluation. Ask only questions that could materially change the recommendation.
11. **No fabricated research.** If search is unavailable or incomplete, disclose the limitation. Never claim that no solution exists based on a shallow search.
12. **Respect the user's constraints.** Consider their platforms, budget, skills, preferred technologies, open-source preferences, privacy, offline requirements, and willingness to maintain the result.

## Workflow

### Phase 1 — Define the intention

Write a concise problem statement:

> [User/person] wants to [achieve outcome] because [need or motivation]. Success means [observable result].

Identify:
- intended users and use frequency;
- the actual job to be done;
- what is painful or impossible with current tools;
- whether the goal is utility, learning, exploration, business, or a mix;
- hard constraints (platforms, offline/local-first, budget, privacy, deadline, skills);
- must-have requirements and explicit non-goals.

Do not confuse a proposed feature with the underlying need. For example, “build a recipe app” is a proposed solution; “quickly retrieve and use my own recipes offline” is a possible underlying need.

If the intention remains vague, proceed with stated assumptions and mark confidence as low.

### Phase 2 — Research existing solutions

Search as appropriate:
- established products and apps;
- open-source repositories and their recent activity;
- libraries, SDKs, command-line tools, platform-native features, and plugins;
- templates, starter kits, and reusable components;
- workflows or combinations of existing tools that achieve the same outcome.

For each credible candidate, inspect evidence where possible:
- current capabilities and platform coverage;
- license and restrictions;
- maintenance signals (recent releases/commits, issue activity, compatibility);
- installation and operating requirements;
- data portability, privacy, offline support, and lock-in;
- missing requirements and the real size of any gap.

Prefer primary sources: official documentation, project repositories, release notes, and product documentation. Use community reports as supplementary evidence, not unquestioned fact.

Classify findings:
- **Direct substitute:** already achieves the intended outcome.
- **Near substitute:** covers most needs, with a gap or workaround.
- **Reusable component:** useful building block, not a complete solution.
- **No credible match found:** only if the search scope and sources justify this limited claim.

Include search terms or search scope when useful. Distinguish verified facts, interpretation, and unknowns. Do not infer that a repository is healthy solely from stars.

### Phase 3 — Compare the real options

Always consider these options, even if some are quickly ruled out:

A. Do nothing / keep the current workflow.
B. Use an existing solution as-is.
C. Configure or automate an existing tool.
D. Combine existing tools or libraries.
E. Fork, wrap, or extend an existing project.
F. Build a small custom utility.
G. Build a full custom application.

Compare the strongest viable options against the same requirements. Avoid straw-man comparisons. Prefer the least complex option that satisfies the user's actual intention.

### Phase 4 — Estimate effort and risk

For each viable approach, estimate the following where relevant:

- discovery and specification;
- prototype / proof of concept;
- usable MVP;
- reliable, polished release;
- tests, edge cases, debugging, and integration;
- packaging, distribution, and platform-specific work;
- maintenance over 3–12 months;
- key external dependencies and failure points.

Give **optimistic / realistic / pessimistic** estimates when meaningful. State the assumed developer experience, agent capability, available tools, scope, and quality bar.

Separate:
- active human time;
- AI/agent execution time;
- elapsed time, including review and waiting;
- recurring maintenance effort.

If estimating files or lines of code, use broad ranges and explain the architecture behind them. Do not invent precision from a feature list. For an unfamiliar dependency or technically risky feature, recommend a small test before estimating the whole project confidently.

Assess agent-friendliness:
- can work be split into independent, testable tasks?
- are the frameworks and APIs well documented?
- can tests verify results automatically?
- are visual, hardware, platform, or integration issues likely to require manual judgment?
- is the codebase small and conventional enough to maintain?

### Phase 5 — Evaluate value and alignment

Evaluate these dimensions on a 0–10 scale. Scores are decision aids, not scientific measurements.

| Dimension                          | Weight | What a high score means                                                                     |
|------------------------------------|-------:|---------------------------------------------------------------------------------------------|
| Clarity of intention               |    15% | The outcome and success criteria are concrete                                               |
| Practical or personal value        |    20% | The result solves a meaningful problem or strongly serves a declared learning/creative goal |
| Gap versus alternatives            |    20% | Existing options leave a material, evidenced gap                                            |
| Value relative to total effort     |    20% | The expected benefit justifies build and maintenance costs                                  |
| Feasibility and agent-friendliness |    10% | Risks are manageable and progress can be verified                                           |
| Sustainability and fit             |    15% | The project fits the user's constraints and can realistically be maintained                 |

Calculate a weighted score only if there is enough evidence to make it meaningful. If evidence is weak, mark the score provisional instead of implying certainty.

Do not allow the total to conceal a critical blocker. Explicitly identify:
- fatal or near-fatal blockers;
- major unknowns;
- likely scope creep;
- opportunity cost;
- whether the project would compete with a more important goal;
- whether a tiny experiment could settle the central uncertainty.

### Phase 6 — Reduce to the minimum justified scope

Create three lists:

- **Essential:** directly required for the intended outcome.
- **Defer:** useful but not needed to validate or achieve the initial outcome.
- **Remove:** features with weak value, high cost, or no clear connection to the intention.

Prefer a thin vertical slice that proves the riskiest assumption. Avoid designing a complete architecture before the need and technical risks are validated.

### Phase 7 — Decide

Choose one primary verdict:

- **BUILD** — the need is clear, alternatives are insufficient, and expected value justifies the cost.
- **PROTOTYPE FIRST** — a material uncertainty can be tested cheaply before committing.
- **ADAPT EXISTING PROJECT** — an existing codebase or product is the best foundation.
- **USE EXISTING SOLUTION** — the need is already adequately met.
- **POSTPONE** — potentially worthwhile, but timing, resources, or prerequisites are unfavorable.
- **ABANDON** — weak value, redundant solution, disproportionate cost, or poor fit.

The verdict must follow the evidence, not the user's enthusiasm or the agent's ability to code.

Include:
1. strongest argument in favor;
2. strongest argument against;
3. best alternative;
4. what would change the verdict;
5. one concrete next action;
6. a time-boxed validation experiment if appropriate.

If recommending a prototype, define its question, scope, time limit, and pass/fail signal. Do not turn the prototype into a disguised full implementation.

## Required output format

Keep the report proportionate to the decision. A small idea does not need a long consulting report.

### 1. Verdict
One primary recommendation, confidence (low / medium / high), and a short rationale.

### 2. Intention
Problem, intended outcome, success criterion, and assumptions.

### 3. Existing alternatives
A concise table with candidate, type, what it already solves, key gap, evidence/source, and maintenance/license concerns where relevant.

### 4. Options comparison
Compare the strongest approaches, including doing nothing or reusing an existing tool. Include benefits, limitations, and relative effort.

### 5. Effort estimate
Prototype, MVP, polished version, and maintenance ranges where relevant. State assumptions and uncertainty.

### 6. Scope recommendation
Essential / defer / remove.

### 7. Scorecard
Weighted scores with short justifications, plus any critical blocker or uncertainty.

### 8. Next action
One concrete action that is proportionate to the evidence. Avoid generic advice such as “do more research.”

## Final self-check

Before responding, verify:
- Did I evaluate the underlying intention rather than blindly accept the proposed app?
- Did I research alternatives where possible and cite important claims?
- Did I fairly consider reuse and doing nothing?
- Did I include maintenance and testing, not just coding?
- Did I distinguish facts from assumptions?
- Are estimates ranges with stated assumptions?
- Did I identify the smallest experiment or scope that could work?
- Is the verdict clear and supported?
- Would I give the same recommendation if I were not rewarded for generating code?

If any answer is no, revise the evaluation.
