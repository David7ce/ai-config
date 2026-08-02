'use strict';
// wrap: generates per-tool AI agent config from a project's .ai/ (source of truth).
// No arrow-key TUI dependency: a plain numbered menu via readline covers "menu" at zero deps
// and is more reliably cross-platform (Windows terminals + raw mode are a real footgun).
// Pass flags to skip the menu (scriptable/CI use): --claude --codex --opencode --gemini
// --antigravity --cursor --windsurf --copilot --mcp --all --target <dir> --source <dir>
const fs = require('fs');
const path = require('path');
const { write, pickFromMenu } = require('./lib');
const { loadConfig, parseFrontmatter } = require('../core/config-loader');
const { hasErrors } = require('../core/diagnostics');
const { AdapterRegistry } = require('../core/adapter-registry');
const { createTargetDefinitions } = require('./target-definitions');
const { createRenderers } = require('./renderers');

/* Target definitions are created after renderer declarations below.
const TARGETS = [
  {
    key: 'claude',
    label: 'Claude Code',
    file: 'CLAUDE.md',
    generate: (src, targetDir, sourceDir, sourceConfig) => [
      write(targetDir, 'CLAUDE.md', genClaude(src)),
      ...writeFresh(targetDir, '.claude/agents', sourceConfig.agents.map((a) => [`${a.id}.md`, genClaudeAgent({ name: a.id, meta: a.metadata })])),
      ...writeFresh(targetDir, '.claude/commands', sourceConfig.prompts.map((p) => [`${p.id}.md`, genPromptFile({ name: p.id, meta: p.metadata })])),
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
    generate: (src, targetDir, sourceDir, sourceConfig) => [
      write(targetDir, 'AGENTS.md', genAgentsMd(src)),
      ...writeFresh(targetDir, '.opencode/agents', sourceConfig.agents.map((a) => [`${a.id}.md`, genOpencodeAgent({ name: a.id, meta: a.metadata })])),
      ...writeFresh(
        targetDir,
        '.opencode/commands',
        sourceConfig.prompts.map((p) => [`${p.id}.md`, genPromptFile({ name: p.id, meta: p.metadata }, { agentBinding: true })])
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
    key: 'antigravity',
    label: 'Antigravity CLI',
    file: '.agents/AGENTS.md',
    generate: (src, targetDir) => [write(targetDir, '.agents/AGENTS.md', genAntigravity(src))],
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
    label: 'GitHub Copilot CLI',
    file: '.github/copilot-instructions.md',
    generate: (src, targetDir, sourceDir, sourceConfig) => [
      write(targetDir, '.github/copilot-instructions.md', genCopilot(src)),
      ...writeFresh(targetDir, '.github/agents', sourceConfig.agents.map((a) => [`${a.id}.agent.md`, genGithubAgent({ name: a.id, meta: a.metadata })])),
      ...writeFresh(targetDir, '.github/prompts', [
        ...sourceConfig.prompts.map((p) => [`${p.id}.prompt.md`, genPromptFile({ name: p.id, meta: p.metadata }, { command: true })]),
        ...copilotBespokePrompts(sourceDir),
      ]),
    ],
  },
  {
    key: 'mcp',
    label: 'MCP servers',
    file: '.mcp.json + .vscode/mcp.json',
    generate: (src, targetDir, sourceDir, sourceConfig) => genMcp(targetDir, sourceConfig),
  },
]; */

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
    adapters.list().map((t) => ({ key: t.key, label: t.label, extra: t.file })),
    'AI Config — select which agents to set up (.ai/ is the source of truth)'
  );

// ---- .ai/ source ----

function listMd(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
}

function toSourceView(config) {
  const portable = (source) => source.replace(/\\/g, '/');
  return {
    hasInstructions: config.instructions.length > 0,
    coreSkills: config.skills.core.map((skill) => portable(skill.source)),
    projectSkills: config.skills.projects.map((skill) => portable(skill.source)),
    prompts: config.prompts.map((prompt) => portable(prompt.source)),
    agentDefs: config.agents.map((agent) => portable(agent.source)),
  };
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

const adapters = new AdapterRegistry(createTargetDefinitions({ ...createRenderers({ write, parseFrontmatter }) }));

async function run(argv) {
  const { flags, opts } = parseArgs(argv);
  const targetDir = path.resolve(opts.target || '.');
  const sourceDir = path.resolve(opts.source || path.join(targetDir, '.ai'));

  let selected = new Set();
  if (flags.has('all')) {
    selected = new Set(adapters.keys());
  } else {
    for (const t of adapters.list()) if (flags.has(t.key)) selected.add(t.key);
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

  const loaded = loadConfig(sourceDir);
  if (hasErrors(loaded.diagnostics)) {
    for (const item of loaded.diagnostics) {
      console.error(`${item.code}: ${item.message}${item.file ? ` (${item.file})` : ''}`);
    }
    throw new Error('Cannot generate from an invalid AI Config. Run `ai-config validate` for details.');
  }
  const src = toSourceView(loaded.config);
  const written = [];
  for (const target of adapters.list()) {
    if (selected.has(target.key)) written.push(...target.generate(src, targetDir, sourceDir, loaded.config));
  }
  // codex and opencode both write AGENTS.md (it's a real shared standard, not a mistake) —
  // dedupe so a combined run doesn't list the same path twice
  const uniqueWritten = [...new Set(written)];

  console.log(`\n✓ wrote ${uniqueWritten.length} item(s) to ${targetDir}:`);
  for (const f of uniqueWritten) console.log(`  - ${f}`);
}

module.exports = { run };
