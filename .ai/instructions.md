# Workspace Instructions (Joomla6)

## Purpose

Define always-on behavior for AI coding agents in this repository so skill and workflow usage stays consistent across tools.

## Decision hierarchy

Apply this precedence order whenever instructions conflict:

1. `.ai/skills/core/architecture.md`
2. Project-specific skill rules under `.ai/skills/projects/joomla/`
3. Reusable workflow in `.ai/workflows/joomlagen-workflow.md`
4. Prompt templates under `.github/prompts/`

## Default mode

- Prioritize minimal, safe, reversible changes.
- Keep Joomla MVC flow intact.
- Prefer internal Joomla APIs over direct SQL.
- Do not introduce unapproved dependencies.

## Routing policy

- Use the `JoomlaGen` agent (defined in `.ai/agents/JoomlaGen.md`) for Joomla implementation, refactor, testing, and review tasks.
- Use the `joomlagen-workflow` workflow for multi-step execution with validation and DoD closure.
- Use prompt templates from `.github/prompts/` only to structure task input, not as rule sources.
- If a task is not Joomla-specific, avoid forcing Joomla workflow files.

## Execution policy

- Read architecture rules before implementation.
- Apply only the technical files required by the current change.
- Keep edits scoped to the request and avoid speculative refactors.
- Prefer changes that are easy to test and easy to revert.

## Security baseline

- Validate input and escape output.
- Treat all user-provided data as untrusted.
- Prevent XSS and CSRF regressions.
- Avoid unsafe SQL patterns.

## Data and frontend guardrails

- Treat JSON files under `/data/` as read-only at runtime.
- Use inline payloads only for small, first-render-critical data.
- Use AJAX for larger or non-critical payloads.
- Keep JavaScript modular and avoid global state.
- Keep CSS aligned with BEM and mobile-first principles.

## Completion rule

A task is considered complete only if `review.md`, `testing.md`, and `definition-of-done.md` criteria are met.
