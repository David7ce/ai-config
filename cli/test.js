#!/usr/bin/env node
'use strict';
// Smoke test, not a suite: fails loudly if the generator or MCP logic breaks.
// ponytail: no framework, no fixtures — assert + a throwaway .ai/ built in a temp dir.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PassThrough } = require('stream');
const wrap = require('./wrap');
const dotfiles = require('./dotfiles');
const lib = require('./lib');

function testTriStateHelpers() {
  const categories = [
    { key: 'cats', label: 'Cats', items: [{ key: 'a', label: 'Alpha' }, { key: 'b', label: 'Beta' }] },
    { key: 'dogs', label: 'Dogs', items: [{ key: 'c', label: 'Gamma' }] },
  ];
  const allSelected = new Set(['cats:a', 'cats:b', 'dogs:c']);

  assert.strictEqual(lib.triState(['cats:a', 'cats:b'], allSelected), 'all', 'triState: all selected');
  assert.strictEqual(lib.triState(['cats:a', 'cats:b'], new Set()), 'none', 'triState: none selected');
  assert.strictEqual(lib.triState(['cats:a', 'cats:b'], new Set(['cats:a'])), 'some', 'triState: partially selected');

  const { lines, index } = lib.renderMenu(categories, allSelected);
  assert.strictEqual(lines.length, 5, 'renderMenu: one row per category + one per item (2 categories, 3 items)');
  assert.match(lines[0], /\[x\] Cats/, 'renderMenu: fully-selected category shows [x]');
  assert.match(lines[1], /\[x\] Alpha/, 'renderMenu: selected item shows [x]');
  assert.strictEqual(index.size, 5, 'renderMenu: index has one entry per numbered row');

  // toggling the "Cats" category row (its number has 2 itemKeys) clears both children
  const catsRowNum = [...index.entries()].find(([, e]) => e.itemKeys.length === 2)[0];
  const afterCategoryToggle = lib.toggle(allSelected, index, catsRowNum);
  assert.ok(!afterCategoryToggle.has('cats:a') && !afterCategoryToggle.has('cats:b'), 'toggle: category toggle clears all its items when fully selected');
  assert.ok(afterCategoryToggle.has('dogs:c'), "toggle: category toggle doesn't touch other categories");
  assert.ok(allSelected.has('cats:a'), 'toggle: does not mutate the input Set');

  // toggling a single item row only flips that one item
  const alphaRowNum = [...index.entries()].find(([, e]) => e.itemKeys[0] === 'cats:a' && e.itemKeys.length === 1)[0];
  const afterItemToggle = lib.toggle(allSelected, index, alphaRowNum);
  assert.ok(!afterItemToggle.has('cats:a'), 'toggle: item toggle deselects that item');
  assert.ok(afterItemToggle.has('cats:b'), "toggle: item toggle doesn't touch its sibling");

  // toggling a category that's only partly selected selects the rest (opposite of 'all')
  const partial = new Set(['cats:a']);
  const { index: partialIndex } = lib.renderMenu(categories, partial);
  const catsRowNum2 = [...partialIndex.entries()].find(([, e]) => e.itemKeys.length === 2)[0];
  const afterPartialToggle = lib.toggle(partial, partialIndex, catsRowNum2);
  assert.ok(afterPartialToggle.has('cats:a') && afterPartialToggle.has('cats:b'), 'toggle: toggling a "some" category selects all its items');

  console.log('ok — tri-state helpers');
}

async function testPickTriState() {
  const categories = [
    { key: 'fruit', label: 'Fruit', items: [{ key: 'apple', label: 'Apple' }, { key: 'pear', label: 'Pear' }] },
  ];
  const input = new PassThrough();
  const output = new PassThrough();
  output.resume(); // drain so the stream doesn't back up — we don't assert on prompt text here

  const resultPromise = lib.pickTriState(categories, 'Pick fruit', { input, output });
  // deselect "Apple" (item row 2: row 1 is the "Fruit" category, row 2 is "Apple"), then confirm
  input.write('2\n');
  input.write('\n');
  const result = await resultPromise;

  assert.ok(!result.has('fruit:apple'), 'pickTriState: deselected item is not in the result');
  assert.ok(result.has('fruit:pear'), 'pickTriState: untouched item stays selected');
  console.log('ok — pickTriState readline wiring');
}

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
      remote: { url: 'https://example.com/mcp', type: 'http' },
    })
  );
}

async function main() {
  testTriStateHelpers();
  await testPickTriState();
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

  assert.strictEqual(claudeMcp.mcpServers.remote.type, 'http', 'Claude MCP remote server keeps explicit type: http');
  assert.strictEqual(claudeMcp.mcpServers.remote.url, 'https://example.com/mcp', 'Claude MCP remote server url');
  assert.strictEqual(claudeMcp.mcpServers.remote.command, undefined, 'Claude MCP remote server has no command');

  const vscodeMcp = JSON.parse(fs.readFileSync(path.join(targetDir, '.vscode/mcp.json'), 'utf8'));
  assert.strictEqual(vscodeMcp.servers.demo.env.TOKEN, '${env:DEMO_TOKEN}', 'VS Code MCP env placeholder');
  assert.strictEqual(vscodeMcp.servers.demo.type, 'stdio', 'VS Code MCP has type: stdio');
  assert.strictEqual(vscodeMcp.servers.remote.type, 'http', 'VS Code MCP remote server type: http');
  assert.strictEqual(vscodeMcp.servers.remote.url, 'https://example.com/mcp', 'VS Code MCP remote server url');

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

  // dotfiles remove — unlike import/list/plugins/tree, this deletes from the *source*
  // (skills/personal/) unconditionally; --home only redirects where the live copy is, it
  // does NOT sandbox the source. That makes sourceDir being a disposable tmp dir (not the
  // real .ai/) the only thing standing between this test and deleting a real personal skill
  // — confirmed the hard way once already. Never run `remove` against the real sourceDir.
  // Uses its own skill (not demo-skill, which later assertions still need) — imported
  // first so both the source and the live copy exist for remove to delete.
  fs.mkdirSync(path.join(sourceDir, 'skills/personal/removable-skill'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills/personal/removable-skill/SKILL.md'), '# removable\n');
  await dotfiles.run(['import', '--claude', '--home', fakeHome], sourceDir);
  await dotfiles.run(['remove', 'removable-skill', '--claude', '--home', fakeHome], sourceDir);
  assert.ok(
    !fs.existsSync(path.join(sourceDir, 'skills/personal/removable-skill')),
    'remove deletes the skill from the source (skills/personal/), not just the live copy'
  );
  assert.ok(
    !fs.existsSync(path.join(fakeHome, '.claude/skills/removable-skill')),
    'remove also deletes the skill from the live copy at --home'
  );
  assert.ok(
    fs.existsSync(path.join(sourceDir, 'skills/personal/demo-skill')),
    "remove only deletes the named skill, doesn't touch others"
  );

  // dotfiles plugins — runs each package's {agent, command, args} install steps from
  // plugins.json (tool-agnostic — a step can be `claude plugin install ...` or
  // `codex mcp add ...` just as well; a package with steps for more than one agent is one
  // entry, not a copy per agent). Use `node --version` (always present, no network, exit 0)
  // instead of a real installer so the test proves the runner works without actually
  // installing anything.
  fs.writeFileSync(
    path.join(sourceDir, 'plugins.json'),
    JSON.stringify([
      { label: 'demo installer', installs: [{ agent: 'demo', command: process.execPath, args: ['--version'] }] },
      {
        label: 'shell-demo',
        // a single agent needing two chained CLI calls (marketplace add, then install) is
        // still one step, not two — {shell} instead of a second {command, args} entry
        installs: [{ agent: 'claude', shell: 'claude plugin marketplace add foo/bar && claude plugin install shell-demo@bar --scope user' }],
      },
    ])
  );
  await dotfiles.run(['plugins', '--claude', '--home', fakeHome], sourceDir); // just confirm it doesn't throw

  // dotfiles list's drift check must extract "shell-demo@bar" from the {shell} step above,
  // the same way it does from a plain {command, args} step, to compare against enabledPlugins
  fs.writeFileSync(path.join(fakeHome, '.claude/settings.json'), JSON.stringify({ enabledPlugins: {} }));
  const listLogs = [];
  const origLogForList = console.log;
  console.log = (...a) => listLogs.push(a.join(' '));
  await dotfiles.run(['list', '--claude', '--home', fakeHome], sourceDir);
  console.log = origLogForList;
  assert.match(
    listLogs.join('\n'),
    /shell-demo@bar/,
    "list's plugin drift check extracts the plugin id out of a chained {shell} install step"
  );

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
  assert.match(treeOutput, /demo installer \[demo\]/, 'tree shows which agent(s) a package installs for');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ok — all checks passed');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
