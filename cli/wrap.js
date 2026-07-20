'use strict';
// wrap: generates per-tool AI agent config from a project's .ai/ (source of truth).
// No arrow-key TUI dependency: a plain numbered menu via readline covers "menu" at zero deps
// and is more reliably cross-platform (Windows terminals + raw mode are a real footgun).
// Pass flags to skip the menu (scriptable/CI use): --claude --codex --opencode --gemini
// --cursor --windsurf --copilot --mcp --all --target <dir> --source <dir>
const fs = require('fs');
const path = require('path');
const { write, pickFromMenu } = require('./lib');

// Each entry is everything there is to know about one target: label + path for the menu,
// generate() for `run()`. Adding a tool means adding one entry here — nowhere else.
// Not "agents": mcp is a service config, not an agent, so TARGETS is the honest name.
const TARGETS = [
  {
    key: 'claude',
    label: 'Claude Code',
    file: 'CLAUDE.md',
    generate: (src, targetDir, sourceDir) => [
      write(targetDir, 'CLAUDE.md', genClaude(src)),
      ...writeFresh(targetDir, '.claude/agents', readAgents(sourceDir).map((a) => [`${a.name}.md`, genClaudeAgent(a)])),
      ...writeFresh(targetDir, '.claude/commands', readPrompts(sourceDir).map((p) => [`${p.name}.md`, genPromptFile(p)])),
      ...materializeClaudeSkills(sourceDir, targetDir, src),
    ],
  },
  {
    key: 'codex',
    label: 'Codex',
    file: 'AGENTS.md',
    generate: (src, targetDir) => [write(targetDir, 'AGENTS.md', genAgentsMd(src))],
  },
  {
    key: 'opencode',
    label: 'opencode',
    file: 'AGENTS.md + .opencode/agents, .opencode/commands',
    generate: (src, targetDir, sourceDir) => [
      write(targetDir, 'AGENTS.md', genAgentsMd(src)),
      ...writeFresh(targetDir, '.opencode/agents', readAgents(sourceDir).map((a) => [`${a.name}.md`, genOpencodeAgent(a)])),
      ...writeFresh(
        targetDir,
        '.opencode/commands',
        readPrompts(sourceDir).map((p) => [`${p.name}.md`, genPromptFile(p, { agentBinding: true })])
      ),
    ],
  },
  {
    key: 'gemini',
    label: 'Gemini CLI',
    file: 'GEMINI.md',
    generate: (src, targetDir) => [write(targetDir, 'GEMINI.md', genGemini())],
  },
  {
    key: 'cursor',
    label: 'Cursor',
    file: '.cursor/rules/project.mdc',
    generate: (src, targetDir) => [write(targetDir, '.cursor/rules/project.mdc', genCursor(src))],
  },
  {
    key: 'windsurf',
    label: 'Windsurf',
    file: '.windsurfrules',
    generate: (src, targetDir) => [write(targetDir, '.windsurfrules', genWindsurf(src))],
  },
  {
    key: 'copilot',
    label: 'GitHub Copilot',
    file: '.github/copilot-instructions.md',
    generate: (src, targetDir, sourceDir) => [
      write(targetDir, '.github/copilot-instructions.md', genCopilot(src)),
      ...writeFresh(targetDir, '.github/agents', readAgents(sourceDir).map((a) => [`${a.name}.agent.md`, genGithubAgent(a)])),
      ...writeFresh(targetDir, '.github/prompts', [
        ...readPrompts(sourceDir).map((p) => [`${p.name}.prompt.md`, genPromptFile(p, { command: true })]),
        ...copilotBespokePrompts(sourceDir),
      ]),
    ],
  },
  {
    key: 'mcp',
    label: 'MCP servers',
    file: '.mcp.json + .vscode/mcp.json',
    generate: (src, targetDir, sourceDir) => genMcp(targetDir, sourceDir),
  },
];

function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target' || a === '--source') opts[a.slice(2)] = argv[++i];
    else if (a.startsWith('--')) flags.add(a.slice(2));
  }
  return { flags, opts };
}

const askMenu = () =>
  pickFromMenu(
    TARGETS.map((t) => ({ key: t.key, label: t.label, extra: t.file })),
    'AI Config — select which agents to set up (.ai/ is the source of truth)'
  );

// ---- .ai/ source ----

function listMd(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
}

// A *.prompt.md file in .ai/prompts/ is a bespoke, tool-specific template (currently
// Copilot-only) — copied verbatim by copilotBespokePrompts(), not a generic source, so it's
// excluded everywhere else prompts/ gets listed.
const isBespokePrompt = (f) => f.endsWith('.prompt.md');

function readSource(sourceDir) {
  const hasInstructions = fs.existsSync(path.join(sourceDir, 'instructions.md'));
  const coreSkills = listMd(path.join(sourceDir, 'skills/core')).map((f) => `skills/core/${f}`);
  const projectsDir = path.join(sourceDir, 'skills/projects');
  const projectSkills = fs.existsSync(projectsDir)
    ? fs
        .readdirSync(projectsDir)
        .filter((d) => fs.statSync(path.join(projectsDir, d)).isDirectory())
        .flatMap((d) => listMd(path.join(projectsDir, d)).map((f) => `skills/projects/${d}/${f}`))
    : [];
  const prompts = listMd(path.join(sourceDir, 'prompts'))
    .filter((f) => !isBespokePrompt(f))
    .map((f) => `prompts/${f}`);
  const agentDefs = listMd(path.join(sourceDir, 'agents')).map((f) => `agents/${f}`);
  return { hasInstructions, coreSkills, projectSkills, prompts, agentDefs };
}

function scaffoldSource(sourceDir) {
  if (fs.existsSync(sourceDir)) return false;
  for (const d of ['skills/core', 'skills/projects', 'prompts', 'agents']) {
    fs.mkdirSync(path.join(sourceDir, d), { recursive: true });
  }
  fs.writeFileSync(
    path.join(sourceDir, 'instructions.md'),
    '# Project Instructions\n\nGlobal rules for AI agents working in this repo.\n'
  );
  return true;
}

// ---- shared "read these files" sections ----

function sections(src) {
  const out = [];
  if (src.hasInstructions) out.push(['Global rules', ['instructions.md']]);
  if (src.coreSkills.length) out.push(['Core skills (always apply)', src.coreSkills]);
  if (src.projectSkills.length) out.push(['Project skills (load by task scope)', src.projectSkills]);
  if (src.prompts.length) out.push(['Prompts', src.prompts]);
  if (src.agentDefs.length) out.push(['Agents', src.agentDefs]);
  return out;
}

function renderRefList(src, { headers }) {
  const lines = ['Source of truth: `.ai/` directory.', '', 'Read these files before any task:', ''];
  for (const [title, files] of sections(src)) {
    lines.push(headers ? `## ${title}` : `${title}:`);
    for (const f of files) lines.push(`- \`.ai/${f}\``);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

// ---- per-tool generators (formats confirmed against this repo's own working files) ----

// Project skills are deliberately NOT @-imported here (unlike core skills, which are
// always-on and belong eagerly-loaded). They're materialized as real Claude Skills by
// materializeClaudeSkills() below, so Claude discovers and loads each one only when its
// description matches the task — @-importing them here would load every project's rules
// into every session regardless of relevance.
function genClaude(src) {
  const lines = ['# Claude Workspace Instructions', ''];
  if (src.hasInstructions) lines.push('@.ai/instructions.md', '');
  for (const [title, files] of sections(src)) {
    if (title === 'Global rules' || title === 'Project skills (load by task scope)') continue;
    lines.push(`## ${title}`, '');
    for (const f of files) lines.push(`@.ai/${f}`);
    lines.push('');
  }
  if (src.projectSkills.length) lines.push('Project skills load on demand — see `.claude/skills/`.', '');
  return lines.join('\n').trimEnd() + '\n';
}

const genAgentsMd = (src) => `# Agent Workspace Instructions\n\n${renderRefList(src, { headers: true })}`;

const genGemini = () =>
  '# Gemini Workspace Instructions\n\n' +
  'Source of truth: `.ai/` directory.\n\n' +
  'Read `AGENTS.md` for the full instruction set, skill references, and prompt definitions.\n';

const genWindsurf = (src) => `# Windsurf Project Rules\n\n${renderRefList(src, { headers: false })}`;

const genCursor = (src) =>
  `---\ndescription: Project-wide AI rules for this workspace\nalwaysApply: true\n---\n\n` +
  `# Project Rules\n\n${renderRefList(src, { headers: false })}`;

const genCopilot = (src) => `# GitHub Copilot Workspace Instructions\n\n${renderRefList(src, { headers: true })}`;

// ---- MCP ----

function genMcp(targetDir, sourceDir) {
  const mcpFile = path.join(sourceDir, 'mcp-servers.json');
  if (!fs.existsSync(mcpFile)) fs.writeFileSync(mcpFile, '{}\n');
  const source = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));

  const resolveEnv = (envObj, toPlaceholder) => {
    if (!envObj) return undefined;
    const out = {};
    for (const [k, v] of Object.entries(envObj)) {
      out[k] = v && typeof v === 'object' && 'fromEnv' in v ? toPlaceholder(v.fromEnv) : v;
    }
    return out;
  };

  const build = (toPlaceholder, includeType) => {
    const servers = {};
    for (const [name, def] of Object.entries(source)) {
      const entry = {};
      if (includeType) entry.type = 'stdio';
      entry.command = def.command;
      entry.args = def.args;
      const env = resolveEnv(def.env, toPlaceholder);
      if (env) entry.env = env;
      servers[name] = entry;
    }
    return servers;
  };

  write(targetDir, '.mcp.json', JSON.stringify({ mcpServers: build((v) => `\${${v}}`, false) }, null, 2) + '\n');
  write(
    targetDir,
    '.vscode/mcp.json',
    JSON.stringify({ servers: build((v) => `\${env:${v}}`, true) }, null, 2) + '\n'
  );
  return ['.mcp.json', '.vscode/mcp.json'];
}

// ---- Agents & Prompts (generated from .ai/agents/ + .ai/prompts/, one shared source each
// — not one hand-copied file per tool). Each agent is one behavior doc
// (.ai/agents/<name>.md) plus an optional metadata sidecar (.ai/agents/<name>.json) that
// holds exactly what can't be derived: model IDs and tool-name vocab genuinely differ per
// tool (Claude's `tools: [Read, Edit, ...]` vs Copilot's `tools: [vscode/getProjectSetupInfo,
// ...]`). Prompts need less: per-tool frontmatter (opencode's `agent:` binding, Copilot's
// `command:`) is generated from one flat frontmatter block already on the source .md. ----

function readFrontmatter(raw) {
  const meta = {};
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return meta;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return meta;
}

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
}

function readAgents(sourceDir) {
  const dir = path.join(sourceDir, 'agents');
  return listMd(dir).map((f) => {
    const name = f.replace(/\.md$/, '');
    return { name, meta: readJson(path.join(dir, `${name}.json`), {}) };
  });
}

function readPrompts(sourceDir) {
  const dir = path.join(sourceDir, 'prompts');
  return listMd(dir)
    .filter((f) => !isBespokePrompt(f))
    .map((f) => {
      const name = f.replace(/\.md$/, '');
      return { name, meta: readFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8')) };
    });
}

// Wipes the target dir first — stale extras deleted, not left behind, same rule every
// other generator here follows (mirrorDir's mirroring, materializeClaudeSkills's rmSync).
function writeFresh(targetDir, relDir, entries) {
  const dir = path.join(targetDir, relDir);
  fs.rmSync(dir, { recursive: true, force: true });
  return entries.map(([filename, content]) => `${relDir}/${write(dir, filename, content)}`);
}

const frontmatterBlock = (pairs) => ['---', ...pairs.map(([k, v]) => `${k}: ${v}`), '---'].join('\n');
const q = (s) => JSON.stringify(s); // quote+escape a frontmatter string value

// Shared by all three agent generators below — only the frontmatter fields genuinely
// differ per tool (model IDs, tool-name vocab); the body is always the same two pointers.
function agentBody(name, meta, toolLabel) {
  const body = [`# ${name} Agent (${toolLabel})`, '', `Behavior and scope: see \`.ai/agents/${name}.md\`.`];
  if (meta.workflow) body.push('', `Workflow: see \`.ai/${meta.workflow}\`.`);
  return body.join('\n');
}

function genClaudeAgent({ name, meta }) {
  const c = meta.claude || {};
  const fm = [['name', name]];
  if (meta.description) fm.push(['description', q(meta.description)]);
  if (c.model) fm.push(['model', c.model]);
  if (c.tools) fm.push(['tools', `[${c.tools.join(', ')}]`]);
  return `${frontmatterBlock(fm)}\n\n${agentBody(name, meta, 'Claude')}\n`;
}

function genOpencodeAgent({ name, meta }) {
  const o = meta.opencode || {};
  const fm = [];
  if (meta.description) fm.push(['description', q(meta.description)]);
  if (o.mode) fm.push(['mode', o.mode]);
  if (o.model) fm.push(['model', o.model]);
  return `${frontmatterBlock(fm)}\n\n${agentBody(name, meta, 'opencode')}\n`;
}

function genGithubAgent({ name, meta }) {
  const g = meta.github || {};
  const fm = [['name', name]];
  if (meta.description) fm.push(['description', q(meta.description)]);
  if (g['argument-hint']) fm.push(['argument-hint', q(g['argument-hint'])]);
  if (g.model) fm.push(['model', g.model]);
  if (g.tools) fm.push(['tools', `[${g.tools.join(', ')}]`]);
  return `${frontmatterBlock(fm)}\n\n${agentBody(name, meta, 'GitHub Copilot')}\n`;
}

function genPromptFile({ name, meta }, { agentBinding, command } = {}) {
  const fm = [];
  if (command) fm.push(['command', `/${name}`]);
  if (meta.description) fm.push(['description', q(meta.description)]);
  if (agentBinding && meta.agent) fm.push(['agent', meta.agent]);
  const body = [`# ${meta.title || name}`, '', `Full workflow: \`.ai/prompts/${name}.md\``];
  if (meta.checklist) body.push(`Checklist: \`.ai/${meta.checklist}\``);
  return `${frontmatterBlock(fm)}\n\n${body.join('\n')}\n`;
}

// The one prompt that genuinely isn't a thin "see X" pointer — a fill-in-the-blank task
// template with placeholders, meant to be copy-pasted whole. No generic source to derive
// it from, so it stays hand-authored — copied verbatim, same as everything used to be.
// Lives right in .ai/prompts/ (the *.prompt.md double extension is the marker that
// distinguishes it from the generic *.md sources read by readPrompts() above) — no
// separate per-tool directory needed for one file.
function copilotBespokePrompts(sourceDir) {
  const dir = path.join(sourceDir, 'prompts');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(isBespokePrompt)
    .map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
}

// ---- Claude Skills (on-demand, materialized from .ai/skills/projects/) ----
// Real Claude Code Skills: <name>/SKILL.md, auto-discovered and loaded by description —
// unlike core skills (always-on, @-imported straight into CLAUDE.md above), a project
// skill should only enter context when it's actually relevant. Only Claude Code's
// on-demand discovery is confirmed here; other tools still get project skills listed as
// a plain "read these" reference via renderRefList — same conservative rule dotfiles.js
// already follows for other tools' config shapes: don't guess, don't materialize.
function materializeClaudeSkills(sourceDir, targetDir, src) {
  const entries = src.projectSkills.map((rel) => {
    const [, , project, file] = rel.split('/'); // "skills/projects/<project>/<file>.md"
    const stem = file.replace(/\.md$/, '');
    // flat namespace once materialized — prefix with the project to avoid collisions
    // between e.g. two projects both having a "testing.md" skill
    const name = stem === project || stem.startsWith(`${project}-`) ? stem : `${project}-${stem}`;
    const raw = fs.readFileSync(path.join(sourceDir, rel), 'utf8');
    const desc = readFrontmatter(raw).description || stem;
    // source files may carry CRLF (Windows checkout) — match \r?\n, not just \n
    const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, `---\nname: ${name}\ndescription: ${desc}\n---\n`);
    return [`${name}/SKILL.md`, body];
  });
  return writeFresh(targetDir, '.claude/skills', entries);
}

async function run(argv) {
  const { flags, opts } = parseArgs(argv);
  const targetDir = path.resolve(opts.target || '.');
  const sourceDir = path.resolve(opts.source || path.join(targetDir, '.ai'));

  let selected = new Set();
  if (flags.has('all')) {
    selected = new Set(TARGETS.map((t) => t.key));
  } else {
    for (const t of TARGETS) if (flags.has(t.key)) selected.add(t.key);
  }

  if (selected.size === 0 && flags.size === 0) {
    selected = await askMenu();
  }
  if (selected.size === 0) {
    console.log('Nothing selected. Nothing to do.');
    return;
  }

  if (scaffoldSource(sourceDir)) {
    console.log(`\n✓ scaffolded ${path.relative(targetDir, sourceDir) || '.ai'}/ — empty, fill it in and re-run`);
  }

  const src = readSource(sourceDir);
  const written = [];
  for (const target of TARGETS) {
    if (selected.has(target.key)) written.push(...target.generate(src, targetDir, sourceDir));
  }
  // codex and opencode both write AGENTS.md (it's a real shared standard, not a mistake) —
  // dedupe so a combined run doesn't list the same path twice
  const uniqueWritten = [...new Set(written)];

  console.log(`\n✓ wrote ${uniqueWritten.length} item(s) to ${targetDir}:`);
  for (const f of uniqueWritten) console.log(`  - ${f}`);
}

module.exports = { run };
