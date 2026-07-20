#!/usr/bin/env node
'use strict';
// Smoke test, not a suite: fails loudly if the generator or MCP logic breaks.
// ponytail: no framework, no fixtures — assert + a throwaway .ai/ built in a temp dir.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const wrap = require('./wrap');
const dotfiles = require('./dotfiles');

function buildFixture(sourceDir) {
  fs.mkdirSync(path.join(sourceDir, 'skills/core'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'skills/projects/demo'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'prompts'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'agents'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'instructions.md'), '# Test instructions\n');
  fs.writeFileSync(path.join(sourceDir, 'skills/core/foo.md'), '# foo\n');
  fs.writeFileSync(
    path.join(sourceDir, 'skills/projects/demo/bar.md'),
    '---\nname: bar\ndescription: Demo project skill for bar.\n---\n\n# bar\n'
  );
  // one behavior doc + one metadata sidecar is the whole agent — no per-tool files to
  // hand-maintain; wrap.js generates .claude/agents/, .opencode/agents/, .github/agents/
  fs.writeFileSync(path.join(sourceDir, 'agents/DemoAgent.md'), '# DemoAgent\n\nDemo agent body.\n');
  fs.writeFileSync(
    path.join(sourceDir, 'agents/DemoAgent.json'),
    JSON.stringify({
      description: 'Demo agent description.',
      workflow: 'prompts/baz.md',
      claude: { model: 'sonnet', tools: ['Read', 'Edit'] },
      opencode: { mode: 'subagent', model: 'anthropic/demo' },
      github: { model: 'gpt-4o', tools: ['read/readFile'] },
    })
  );
  // same for prompts: flat frontmatter on the one source file, no per-tool copies
  fs.writeFileSync(
    path.join(sourceDir, 'prompts/baz.md'),
    '---\ntitle: Baz\ndescription: Demo prompt for baz.\nagent: DemoAgent\n---\n\n# baz\n'
  );
  // the one kind of file that stays hand-authored: a Copilot-only template with no
  // generic source to derive from — the *.prompt.md double extension marks it as bespoke,
  // copied verbatim into .github/prompts/ instead of feeding generic generation
  fs.writeFileSync(
    path.join(sourceDir, 'prompts/demo.prompt.md'),
    '---\ncommand: /demo\ndescription: "Bespoke Copilot template"\n---\n\n# Demo template\n'
  );
  fs.writeFileSync(
    path.join(sourceDir, 'mcp-servers.json'),
    JSON.stringify({
      demo: { command: 'npx', args: ['-y', 'demo-server'], env: { TOKEN: { fromEnv: 'DEMO_TOKEN' } } },
    })
  );
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-config-test-'));
  const sourceDir = path.join(tmp, '.ai');
  const targetDir = path.join(tmp, 'target');
  buildFixture(sourceDir);

  // pre-seed stale files where wrap's Claude mirrors will write, to prove the mirrors
  // actually delete destination extras instead of just adding on top
  fs.mkdirSync(path.join(targetDir, '.claude/agents'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.claude/agents/Stale.md'), 'should be gone after wrap\n');
  fs.mkdirSync(path.join(targetDir, '.claude/skills/stale-skill'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.claude/skills/stale-skill/SKILL.md'), 'should be gone after wrap\n');

  await wrap.run(['--all', '--source', sourceDir, '--target', targetDir]);

  const claude = fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /@\.ai\/instructions\.md/, 'CLAUDE.md imports instructions.md');
  assert.match(claude, /@\.ai\/skills\/core\/foo\.md/, 'CLAUDE.md imports core skill');
  assert.doesNotMatch(
    claude,
    /@\.ai\/skills\/projects\/demo\/bar\.md/,
    'CLAUDE.md does NOT eager-import project skills — those load on demand instead'
  );
  assert.match(claude, /`\.claude\/skills\/`/, 'CLAUDE.md points at .claude/skills/ for on-demand project skills');

  const demoSkill = fs.readFileSync(path.join(targetDir, '.claude/skills/demo-bar/SKILL.md'), 'utf8');
  assert.match(
    demoSkill,
    /^---\nname: demo-bar\ndescription: Demo project skill for bar\.\n---/,
    'project skill materialized as a real Claude Skill (project-prefixed name, own frontmatter)'
  );
  assert.ok(
    !fs.existsSync(path.join(targetDir, '.claude/skills/stale-skill')),
    'skill materialization deletes destination extras (stale-skill removed, not left behind)'
  );

  // Agents & Prompts: generated from .ai/agents/DemoAgent.{md,json} and .ai/prompts/baz.md
  // — one shared source each, no per-tool files hand-authored in the fixture.
  const demoAgent = fs.readFileSync(path.join(targetDir, '.claude/agents/DemoAgent.md'), 'utf8');
  assert.match(demoAgent, /name: DemoAgent/, '.claude/agents/ generated with name from filename');
  assert.match(demoAgent, /description: "Demo agent description\."/, '.claude/agents/ generated with description from sidecar');
  assert.match(demoAgent, /model: sonnet/, '.claude/agents/ generated with claude-specific model from sidecar');
  assert.match(demoAgent, /tools: \[Read, Edit\]/, '.claude/agents/ generated with claude-specific tools from sidecar');
  assert.match(demoAgent, /Workflow: see `\.ai\/prompts\/baz\.md`/, '.claude/agents/ generated with workflow pointer');
  assert.ok(
    !fs.existsSync(path.join(targetDir, '.claude/agents/Stale.md')),
    'agent generation deletes destination extras (Stale.md removed, not left behind)'
  );

  const demoCmd = fs.readFileSync(path.join(targetDir, '.claude/commands/baz.md'), 'utf8');
  assert.match(demoCmd, /description: "Demo prompt for baz\."/, '.claude/commands/ generated with description from prompt frontmatter');
  assert.doesNotMatch(demoCmd, /agent:/, 'Claude command wrapper has no agent binding (opencode-only field)');

  const agents = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /`\.ai\/prompts\/baz\.md`/, 'AGENTS.md references the prompt');

  const ocAgent = fs.readFileSync(path.join(targetDir, '.opencode/agents/DemoAgent.md'), 'utf8');
  assert.doesNotMatch(ocAgent, /^name:/m, 'opencode agent has no name field, matching the real confirmed shape');
  assert.match(ocAgent, /mode: subagent/, '.opencode/agents/ generated with opencode-specific mode from sidecar');
  assert.match(ocAgent, /model: anthropic\/demo/, '.opencode/agents/ generated with opencode-specific model from sidecar');

  const ocCmd = fs.readFileSync(path.join(targetDir, '.opencode/commands/baz.md'), 'utf8');
  assert.match(ocCmd, /agent: DemoAgent/, '.opencode/commands/ generated with agent binding from prompt frontmatter');

  const ghAgent = fs.readFileSync(path.join(targetDir, '.github/agents/DemoAgent.agent.md'), 'utf8');
  assert.match(ghAgent, /model: gpt-4o/, '.github/agents/ generated with github-specific model from sidecar');
  assert.match(ghAgent, /tools: \[read\/readFile\]/, '.github/agents/ generated with github-specific tools from sidecar');

  const ghCmd = fs.readFileSync(path.join(targetDir, '.github/prompts/baz.prompt.md'), 'utf8');
  assert.match(ghCmd, /command: \/baz/, '.github/prompts/ generated with command derived from filename');

  const ghBespoke = fs.readFileSync(path.join(targetDir, '.github/prompts/demo.prompt.md'), 'utf8');
  assert.match(ghBespoke, /Bespoke Copilot template/, '.github/prompts/ still copies the one hand-authored template verbatim');

  const gemini = fs.readFileSync(path.join(targetDir, 'GEMINI.md'), 'utf8');
  assert.match(gemini, /Read `AGENTS\.md`/, 'GEMINI.md points at AGENTS.md');

  const claudeMcp = JSON.parse(fs.readFileSync(path.join(targetDir, '.mcp.json'), 'utf8'));
  assert.strictEqual(claudeMcp.mcpServers.demo.env.TOKEN, '${DEMO_TOKEN}', 'Claude MCP env placeholder');
  assert.strictEqual(claudeMcp.mcpServers.demo.type, undefined, 'Claude MCP has no type field');

  const vscodeMcp = JSON.parse(fs.readFileSync(path.join(targetDir, '.vscode/mcp.json'), 'utf8'));
  assert.strictEqual(vscodeMcp.servers.demo.env.TOKEN, '${env:DEMO_TOKEN}', 'VS Code MCP env placeholder');
  assert.strictEqual(vscodeMcp.servers.demo.type, 'stdio', 'VS Code MCP has type: stdio');

  // scaffold: pointing at a source that doesn't exist yet should create an empty skeleton, not throw
  const scaffoldTarget = path.join(tmp, 'scaffold-target');
  await wrap.run(['--claude', '--target', scaffoldTarget]);
  assert.ok(fs.existsSync(path.join(scaffoldTarget, '.ai', 'instructions.md')), 'scaffolds .ai/instructions.md');
  assert.ok(fs.existsSync(path.join(scaffoldTarget, 'CLAUDE.md')), 'still writes CLAUDE.md after scaffolding');

  // dotfiles list touches the real ~/.claude (read-only) — just confirm it doesn't throw.
  // --all bypasses the interactive menu, which would otherwise block on stdin here.
  await dotfiles.run(['list', '--all'], sourceDir);
  await dotfiles.run(['list', '--claude'], sourceDir);
  await dotfiles.run(['list', '--nonexistent-flag'], sourceDir);

  // dotfiles import — never against the real home in an automated test. --home redirects
  // it to a scratch dir; this is also the mechanism a human uses to test import safely.
  fs.mkdirSync(path.join(sourceDir, 'skills/personal/demo-skill'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'claude-hooks'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills/personal/demo-skill/SKILL.md'), '# demo\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-hooks/demo-hook'), '#!/bin/bash\necho hi\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-settings.json'), '{"model":"test"}\n');
  const fakeHome = path.join(tmp, 'fake-home');

  // pre-seed a stale skill in the scratch home to prove import's mirror deletes it, not
  // just adds demo-skill alongside it
  fs.mkdirSync(path.join(fakeHome, '.claude/skills/stale-skill'), { recursive: true });
  fs.writeFileSync(path.join(fakeHome, '.claude/skills/stale-skill/SKILL.md'), 'should be gone after import\n');

  await dotfiles.run(['import', '--claude', '--home', fakeHome], sourceDir);
  assert.ok(
    fs.existsSync(path.join(fakeHome, '.claude/skills/demo-skill/SKILL.md')),
    '--home import writes the skill into the scratch home, not the real one'
  );
  assert.ok(
    !fs.existsSync(path.join(fakeHome, '.claude/skills/stale-skill')),
    'import mirrors skills/ (destination extras deleted, not left behind)'
  );
  assert.ok(
    fs.existsSync(path.join(fakeHome, '.claude/hooks/demo-hook')),
    '--home import writes hook scripts into the scratch home'
  );
  assert.ok(
    fs.existsSync(path.join(fakeHome, '.claude/settings.json')),
    '--home import writes settings.json into the scratch home'
  );

  if (process.platform !== 'win32') {
    const mode = fs.statSync(path.join(fakeHome, '.claude/hooks/demo-hook')).mode & 0o777;
    assert.strictEqual(mode, 0o755, 'imported hook script is chmod +x on POSIX');
  }

  // dotfiles plugins — runs {command, args} entries from plugins.json (tool-agnostic — an
  // entry can be `claude plugin install ...` or `codex mcp add ...` just as well). Use
  // `node --version` (always present, no network, exit 0) instead of a real installer so
  // the test proves the runner works without actually installing anything.
  fs.writeFileSync(
    path.join(sourceDir, 'plugins.json'),
    JSON.stringify([{ label: 'demo installer', command: process.execPath, args: ['--version'] }])
  );
  await dotfiles.run(['plugins', '--claude', '--home', fakeHome], sourceDir); // just confirm it doesn't throw

  // dotfiles tree — home-scope overview (personal skills + settings + plugins), capture
  // stdout to check content. Project-scope stuff (agents, prompts) is wrap.js's job now,
  // not shown here.
  const logs = [];
  const origLog = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  await dotfiles.run(['tree', '--claude', '--home', fakeHome], sourceDir);
  console.log = origLog;
  const treeOutput = logs.join('\n');
  assert.match(treeOutput, /skills\/personal\//, 'tree shows skills/personal/');
  assert.match(treeOutput, /demo-skill/, 'tree lists personal skill names');
  assert.match(treeOutput, /demo installer/, 'tree expands plugins.json labels, not just the filename');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ok — all checks passed');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
