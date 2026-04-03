# Skills for AI Copilot Config

## 1. Purpose

This directory defines reusable skill documents for Copilot agent behavior in VS Code.

Primary goals:

- keep technical consistency,
- reduce duplicated guidance,
- support multiple project families (Joomla and Astro),
- keep quality checks and closure criteria explicit.

## 2. Current repository structure

```plaintext
.github/skills/
├── core/
│   ├── architecture.md
│   ├── workflow.md
│   ├── review.md
│   ├── testing.md
│   ├── definition-of-done.md
│   ├── frontend-css.md
│   └── frontend-javascript.md
├── joomlagen-workflow/
│   └── SKILL.md
└── projects/
    ├── joomla/
    │   ├── joomla.md
    │   ├── php.md
    │   ├── joomla-data-json.md
    │   └── javascript-leaflet.md
    └── astro/
        ├── astro.md
        ├── astro-content.md
        └── astro-routing.md
```

## 3. Precedence and conflict handling

Apply this order whenever rules conflict:

1. `core/architecture.md`
2. relevant technical files in `core/`
3. project rules in `projects/<project>/`
4. workflow execution in `joomlagen-workflow/SKILL.md`

If conflict remains, the more specific project rule wins. Document exceptions in the project file where they apply.

## 4. Recommended usage flow

1. Start with `core/architecture.md`.
2. Load matching technical guidance from `core/`.
3. Load project guidance from `projects/joomla/` or `projects/astro/`.
4. Execute review and testing checklists.
5. Close only when Definition of Done is satisfied.

## 5. Agent, skill, and prompt roles

- `agents/JoomlaGen.agent.md`: domain router for Joomla tasks.
- `skills/joomlagen-workflow/SKILL.md`: execution workflow and quality gates.
- `prompts/joomlagen-workflow-base.prompt.md`: reusable task input template.

Use this split to avoid duplicating workflow logic across files.

## 6. Skill detection in VS Code

VS Code indexes invocable skills only when a folder under `.github/skills/` contains a `SKILL.md` with valid YAML frontmatter.

In this repository, the invocable skill is:

- `.github/skills/joomlagen-workflow/SKILL.md`

Standalone files under `core/` and `projects/` are support rule files and are not directly invocable skills.

## 7. Maintenance checklist

When updating this system:

- keep references synchronized across agent, skill, and prompts,
- avoid adding rules in more than one place,
- keep all routing descriptions explicit with "Use when" wording,
- recheck that paths in this README match the real tree.
