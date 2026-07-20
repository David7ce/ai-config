# Workspace Instructions

## Purpose

Define always-on behavior for AI coding agents in this repository so skill and workflow usage stays consistent across tools.

## Decision hierarchy

Apply this precedence order whenever instructions conflict:

1. `.ai/skills/core/` — rules that apply to every project (always loaded)
2. `.ai/skills/projects/<name>/` — rules specific to a project actually present in this repo (load by task scope)
3. `.ai/prompts/` — multi-step flows that compose the skills above for a given kind of task

## Routing policy

- Load a project skill only when the task actually touches that project/stack; don't force one that doesn't apply.
- Use an agent from `.ai/agents/` when its stated invocation scope matches the task.
- Prioritize minimal, safe, reversible changes; keep edits scoped to the request.

## Completion rule

A task is considered complete only once the criteria defined by the relevant project's `definition-of-done.md` (or equivalent) are met.
