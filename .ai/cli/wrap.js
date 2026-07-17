'use strict';
// wrap: generates per-tool AI agent config from a project's .ai/ (source of truth).
// No arrow-key TUI dependency: a plain numbered menu via readline covers "menu" at zero deps
// and is more reliably cross-platform (Windows terminals + raw mode are a real footgun).
// Pass flags to skip the menu (scriptable/CI use): --claude --codex --gemini --cursor
// --windsurf --copilot --mcp --all --target <dir> --source <dir>
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { write, mirrorDir } = require('./lib');

const AGENTS = [
  { key: 'claude', label: 'Claude Code', file: 'CLAUDE.md' },
  { key: 'codex', label: 'Codex / opencode', file: 'AGENTS.md' },
  { key: 'gemini', label: 'Gemini CLI', file: 'GEMINI.md' },
  { key: 'cursor', label: 'Cursor', file: '.cursor/rules/project.mdc' },
  { key: 'windsurf', label: 'Windsurf', file: '.windsurfrules' },
  { key: 'copilot', label: 'GitHub Copilot', file: '.github/copilot-instructions.md' },
  { key: 'mcp', label: 'MCP servers', file: '.mcp.json + .vscode/mcp.json' },
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

function askMenu() {
  console.log('\nAI Config — select which agents to set up (.ai/ is the source of truth)\n');
  AGENTS.forEach((a, i) => console.log(`  ${String(i + 1).padStart(2)}) ${a.label.padEnd(18)} ${a.file}`));
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\nNumbers separated by spaces/commas, "a" for all, Enter to cancel: ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (!trimmed) return resolve(new Set());
      if (trimmed === 'a' || trimmed === 'all') return resolve(new Set(AGENTS.map((a) => a.key)));
      const picked = new Set();
      for (const tok of trimmed.split(/[\s,]+/)) {
        const agent = AGENTS[parseInt(tok, 10) - 1];
        if (agent) picked.add(agent.key);
      }
      resolve(picked);
    });
  });
}

// ---- .ai/ source ----

function listMd(dir) {
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : [];
}

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
  const workflows = listMd(path.join(sourceDir, 'workflows')).map((f) => `workflows/${f}`);
  const agentDefs = listMd(path.join(sourceDir, 'agents')).map((f) => `agents/${f}`);
  return { hasInstructions, coreSkills, projectSkills, workflows, agentDefs };
}

function scaffoldSource(sourceDir) {
  if (fs.existsSync(sourceDir)) return false;
  for (const d of ['skills/core', 'skills/projects', 'workflows', 'agents']) {
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
  if (src.workflows.length) out.push(['Workflows', src.workflows]);
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

function genClaude(src) {
  const lines = ['# Claude Workspace Instructions', ''];
  if (src.hasInstructions) lines.push('@.ai/instructions.md', '');
  for (const [title, files] of sections(src)) {
    if (title === 'Global rules') continue;
    lines.push(`## ${title}`, '');
    for (const f of files) lines.push(`@.ai/${f}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

const genAgentsMd = (src) => `# Agent Workspace Instructions\n\n${renderRefList(src, { headers: true })}`;

const genGemini = () =>
  '# Gemini Workspace Instructions\n\n' +
  'Source of truth: `.ai/` directory.\n\n' +
  'Read `AGENTS.md` for the full instruction set, skill references, and workflow definitions.\n';

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

// ---- wrapper subtrees (hand-authored, tool-specific — copied verbatim, never templated) ----

function mirrorWrapperSubdirs(sourceDir, targetDir, tool, targetRoot) {
  const srcBase = path.join(sourceDir, 'wrappers', tool);
  if (!fs.existsSync(srcBase)) return [];
  const written = [];
  for (const name of fs.readdirSync(srcBase)) {
    const src = path.join(srcBase, name);
    if (!fs.statSync(src).isDirectory()) continue;
    mirrorDir(src, path.join(targetDir, targetRoot, name));
    written.push(`${targetRoot}/${name}/`);
  }
  return written;
}

async function run(argv) {
  const { flags, opts } = parseArgs(argv);
  const targetDir = path.resolve(opts.target || '.');
  const sourceDir = path.resolve(opts.source || path.join(targetDir, '.ai'));

  let selected = new Set();
  if (flags.has('all')) {
    selected = new Set(AGENTS.map((a) => a.key));
  } else {
    for (const a of AGENTS) if (flags.has(a.key)) selected.add(a.key);
    if (flags.has('opencode')) selected.add('codex');
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
  if (selected.has('claude')) {
    written.push(write(targetDir, 'CLAUDE.md', genClaude(src)));
    written.push(...mirrorWrapperSubdirs(sourceDir, targetDir, 'claude', '.claude'));
  }
  if (selected.has('codex')) written.push(write(targetDir, 'AGENTS.md', genAgentsMd(src)));
  if (selected.has('gemini')) written.push(write(targetDir, 'GEMINI.md', genGemini()));
  if (selected.has('cursor')) written.push(write(targetDir, '.cursor/rules/project.mdc', genCursor(src)));
  if (selected.has('windsurf')) written.push(write(targetDir, '.windsurfrules', genWindsurf(src)));
  if (selected.has('copilot')) {
    written.push(write(targetDir, '.github/copilot-instructions.md', genCopilot(src)));
    written.push(...mirrorWrapperSubdirs(sourceDir, targetDir, 'github', '.github'));
  }
  if (selected.has('mcp')) written.push(...genMcp(targetDir, sourceDir));

  console.log(`\n✓ wrote ${written.length} item(s) to ${targetDir}:`);
  for (const f of written) console.log(`  - ${f}`);
}

module.exports = { run };
