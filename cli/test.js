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
const { validateConfig } = require('../core/config-validator');
const { AdapterRegistry } = require('../core/adapter-registry');
const { createTargetDefinitions } = require('./target-definitions');
const { createClaudeAdapter } = require('../adapters/claude');
const { cleanup } = require('../core/cleanup');

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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-config-test-'));
  const sourceDir = path.join(tmp, '.ai');
  const targetDir = path.join(tmp, 'target');
  buildFixture(sourceDir);

  const registry = new AdapterRegistry();
  registry.register({ key: 'demo', generate() {} });
  assert.deepStrictEqual(registry.keys(), ['demo'], 'adapter registry lists registered adapters');
  assert.throws(() => registry.register({ key: 'demo', generate() {} }), /already registered/, 'adapter registry rejects duplicate keys');
  assert.throws(() => registry.register({ key: 'invalid' }), /must define generate/, 'adapter registry requires a generate function');

  const targetRegistry = new AdapterRegistry(createTargetDefinitions({
    genClaude() {}, genAgentsMd() {}, genGemini() {}, genAntigravity() {}, genCursor() {}, genWindsurf() {},
    genCopilot() {}, genMcp() {}, genCodexMcp() {}, genClaudeAgent() {}, genOpencodeAgent() {}, genGithubAgent() {}, genPromptFile() {},
    materializeClaudeSkills() { return []; }, copilotBespokePrompts() { return []; },
    write() {}, writeFresh() { return []; },
  }));
  assert.ok(targetRegistry.has('claude'), 'built-in target definitions include Claude');
  assert.ok(targetRegistry.has('antigravity'), 'built-in target definitions use Antigravity as the canonical Google adapter');
  assert.ok(!targetRegistry.has('gemini'), 'Gemini is no longer a canonical target key');
  assert.ok(targetRegistry.get('claude').capabilities.skills, 'built-in Claude adapter declares skills capability');
  assert.ok(targetRegistry.get('mcp').capabilities.mcp, 'MCP target declares MCP capability');

  const claudeAdapter = createClaudeAdapter({
    renderers: {
      genClaude() { return ''; },
      genClaudeAgent() { return ''; },
      genPromptFile() { return ''; },
      materializeClaudeSkills() { return []; },
      write() { return 'CLAUDE.md'; },
      writeFresh() { return []; },
    },
  });
  assert.strictEqual(claudeAdapter.key, 'claude', 'Claude adapter has the expected stable key');
  assert.strictEqual(claudeAdapter.file, 'CLAUDE.md', 'Claude adapter declares its primary output');

  const cleanupHome = path.join(tmp, 'cleanup-home');
  fs.mkdirSync(path.join(cleanupHome, '.claude/projects/demo'), { recursive: true });
  fs.mkdirSync(path.join(cleanupHome, '.claude/plugins/cache/old-plugin'), { recursive: true });
  fs.mkdirSync(path.join(cleanupHome, '.claude/plugins/marketplaces/old-marketplace'), { recursive: true });
  fs.mkdirSync(path.join(cleanupHome, '.codex/.tmp/plugins/old-plugin'), { recursive: true });
  fs.mkdirSync(path.join(cleanupHome, '.codex/vendor_imports/old-import'), { recursive: true });
  fs.mkdirSync(path.join(cleanupHome, '.copilot/session-state/old'), { recursive: true });
  fs.writeFileSync(path.join(cleanupHome, '.claude/projects/demo/old.jsonl'), 'old\n');
  fs.writeFileSync(path.join(cleanupHome, '.claude/projects/demo/new.jsonl'), 'new\n');
  fs.writeFileSync(path.join(cleanupHome, '.codex/config.toml'), 'mcp_servers = {}\n');
  const now = Date.now();
  fs.utimesSync(path.join(cleanupHome, '.claude/projects/demo/old.jsonl'), new Date(now - 60 * 86400000), new Date(now - 60 * 86400000));
  const dryRun = cleanup(cleanupHome, { agents: ['claude'], olderThanDays: 30, now });
  assert.strictEqual(dryRun.selected.length, 1, 'cleanup dry run selects old Claude transcripts');
  assert.ok(fs.existsSync(path.join(cleanupHome, '.claude/projects/demo/old.jsonl')), 'cleanup dry run does not delete files');
  cleanup(cleanupHome, { agents: ['claude'], olderThanDays: 30, apply: true, now });
  assert.ok(!fs.existsSync(path.join(cleanupHome, '.claude/projects/demo/old.jsonl')), 'cleanup apply removes selected transcripts');
  assert.ok(fs.existsSync(path.join(cleanupHome, '.claude/projects/demo/new.jsonl')), 'cleanup preserves recent transcripts');
  const allCleanup = cleanup(cleanupHome, { agents: ['claude', 'codex'], olderThanDays: 0, apply: true, now: Date.now() });
  assert.ok(allCleanup.selected.some((item) => item.target === 'plugin-cache'), 'cleanup includes plugin caches');
  assert.ok(!fs.existsSync(path.join(cleanupHome, '.claude/plugins/cache/old-plugin')), 'cleanup removes old Claude plugin cache');
  assert.ok(!fs.existsSync(path.join(cleanupHome, '.codex/.tmp/plugins/old-plugin')), 'cleanup removes old Codex plugin cache');
  assert.ok(!fs.existsSync(path.join(cleanupHome, '.codex/vendor_imports/old-import')), 'cleanup removes old Codex imported plugin content');
  assert.ok(fs.existsSync(path.join(cleanupHome, '.codex/config.toml')), 'cleanup preserves Codex MCP/configuration');

  const pluginSource = path.join(tmp, 'plugin-source');
  fs.mkdirSync(pluginSource, { recursive: true });
  fs.writeFileSync(path.join(pluginSource, 'plugins.json'), JSON.stringify([
    {
      label: 'target-filter-test',
      installs: [
        { agent: 'claude', command: process.execPath, args: ['-e', 'console.log("claude-step")'] },
        { agent: 'antigravity', command: process.execPath, args: ['-e', 'console.log(\'antigravity-step\')'] },
      ],
    },
  ]));
  const pluginTarget = { key: 'antigravity', label: 'Antigravity CLI', homeDir: path.join(tmp, 'plugin-home') };
  const targetPluginLogs = [];
  const originalLog = console.log;
  console.log = (...args) => targetPluginLogs.push(args.join(' '));
  dotfiles.pluginsOne(pluginSource, pluginTarget);
  console.log = originalLog;
  assert.ok(targetPluginLogs.some((line) => line.includes('antigravity-step')), 'plugins execute the selected target step');
  assert.ok(!targetPluginLogs.some((line) => line.includes('claude-step')), 'plugins skip steps for other targets');

  const validFixture = validateConfig(sourceDir);
  assert.ok(validFixture.valid, `fixture should validate: ${JSON.stringify(validFixture.diagnostics)}`);

  fs.writeFileSync(path.join(sourceDir, 'mcp-servers.json'), '{ invalid json');
  const invalidFixture = validateConfig(sourceDir);
  assert.ok(!invalidFixture.valid, 'invalid JSON should fail configuration validation');
  assert.ok(invalidFixture.diagnostics.some((item) => item.code === 'INVALID_JSON'), 'invalid JSON reports a diagnostic code');
  fs.writeFileSync(
    path.join(sourceDir, 'mcp-servers.json'),
    JSON.stringify({
      demo: { command: 'npx', args: ['-y', 'demo-server'], env: { TOKEN: { fromEnv: 'DEMO_TOKEN' } } },
      remote: { url: 'https://example.com/mcp', type: 'http' },
    })
  );

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
  assert.match(gemini, /# Antigravity Workspace Instructions/, 'GEMINI.md generated for Antigravity CLI');

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

  const codexConfig = fs.readFileSync(path.join(targetDir, '.codex/config.toml'), 'utf8');
  assert.match(codexConfig, /\[mcp_servers\.demo\]/, 'Codex config contains stdio MCP server');
  assert.match(codexConfig, /\[mcp_servers\.remote\]/, 'Codex config contains remote MCP server');
  assert.match(codexConfig, /url = "https:\/\/example\.com\/mcp"/, 'Codex config contains remote MCP URL');

  // scaffold: pointing at a source that doesn't exist yet should create an empty skeleton, not throw
  const scaffoldTarget = path.join(tmp, 'scaffold-target');
  await wrap.run(['--claude', '--target', scaffoldTarget]);
  await wrap.run(['--antigravity', '--target', scaffoldTarget]);
  assert.ok(fs.existsSync(path.join(scaffoldTarget, '.ai', 'instructions.md')), 'scaffolds .ai/instructions.md');
  assert.ok(fs.existsSync(path.join(scaffoldTarget, 'CLAUDE.md')), 'still writes CLAUDE.md after scaffolding');
  assert.ok(fs.existsSync(path.join(scaffoldTarget, 'GEMINI.md')), 'writes Antigravity GEMINI.md after scaffolding');

  // dotfiles list touches the real ~/.claude (read-only) — just confirm it doesn't throw.
  // --all bypasses the interactive menu, which would otherwise block on stdin here.
  await dotfiles.run(['list', '--all'], sourceDir);
  await dotfiles.run(['list', '--claude'], sourceDir);
  await dotfiles.run(['list', '--nonexistent-flag'], sourceDir);

  // New DOTFILE_TARGETS entries are selectable by flag and resolve to the right label/homeDir
  // — checked indirectly via listOne's printed header line, since DOTFILE_TARGETS/
  // resolveTargets aren't exported (same reasoning the rest of this file already uses:
  // exercise behavior through dotfiles.run, not internals that aren't part of the module's
  // public surface).
  {
    const targetsHome = path.join(tmp, 'targets-home');
    const logs = [];
    const origLog = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    await dotfiles.run(['list', '--copilot', '--home', targetsHome], sourceDir);
    await dotfiles.run(['list', '--antigravity', '--home', targetsHome], sourceDir);
    console.log = origLog;
    const output = logs.join('\n');
    assert.match(
      output,
      new RegExp(`GitHub Copilot CLI: \\.ai/ \\(source of truth\\) vs ${path.join(targetsHome, '.copilot').replace(/[\\.]/g, '\\$&')}`),
      'DOTFILE_TARGETS: copilot resolves to label "GitHub Copilot CLI" and homeDir <home>/.copilot'
    );
    assert.match(
      output,
      new RegExp(`Antigravity CLI: \\.ai/ \\(source of truth\\) vs ${path.join(targetsHome, '.gemini').replace(/[\\.]/g, '\\$&')}`),
      'DOTFILE_TARGETS: antigravity resolves to the former Gemini homeDir'
    );
  }

  // dotfiles import — never against the real home in an automated test. --home redirects
  // it to a scratch dir; this is also the mechanism a human uses to test import safely.
  fs.mkdirSync(path.join(sourceDir, 'skills/personal/demo-skill'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'claude-hooks'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills/personal/demo-skill/SKILL.md'), '# demo\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-hooks/demo-hook'), '#!/bin/bash\necho hi\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-settings.json'), '{"model":"test"}\n');

  const claudeTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(tmp, 'fake-home', '.claude') };
  assert.strictEqual(dotfiles.readImportManifest(sourceDir, claudeTarget), null, 'readImportManifest: null when .ai/claude-import.txt does not exist');

  // readImportManifest / per-category opt-in unit coverage, independent of the end-to-end
  // behavior asserted further below.
  {
    const manifestUnitSource = path.join(tmp, 'manifest-unit-source');
    fs.mkdirSync(manifestUnitSource, { recursive: true });
    fs.writeFileSync(
      path.join(manifestUnitSource, 'claude-import.txt'),
      '# a comment\n\n  skills:demo-skill  \nsettings:model\n'
    );
    const unitTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(tmp, 'manifest-unit-home') };
    const manifest = dotfiles.readImportManifest(manifestUnitSource, unitTarget);
    assert.deepStrictEqual([...manifest].sort(), ['settings:model', 'skills:demo-skill'], 'readImportManifest: comments/blanks stripped, lines trimmed');
    assert.strictEqual(dotfiles.readImportManifest(manifestUnitSource, { key: 'gemini' }), null, 'readImportManifest: null for a target with no manifest file, even when another target has one');
  }

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

  // importOne with an explicit selection — calls importOne directly with an explicit
  // manifest Set — unit-level, no manifest *file* needed.
  // Add a second skill/settings-key first so there's something to leave OUT.
  fs.mkdirSync(path.join(sourceDir, 'skills/personal/second-skill'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'skills/personal/second-skill/SKILL.md'), '# second\n');
  fs.writeFileSync(path.join(sourceDir, 'claude-settings.json'), '{"model":"test","theme":"auto"}\n');
  const selectHome = path.join(tmp, 'select-home');
  const selectTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(selectHome, '.claude') };
  dotfiles.importOne(sourceDir, selectTarget, new Set(['skills:demo-skill', 'hooks:demo-hook', 'settings:model']));
  assert.ok(fs.existsSync(path.join(selectHome, '.claude/skills/demo-skill')), 'selective import: selected skill is materialized');
  assert.ok(!fs.existsSync(path.join(selectHome, '.claude/skills/second-skill')), 'selective import: unselected skill is NOT materialized');
  const selectiveSettings = JSON.parse(fs.readFileSync(path.join(selectHome, '.claude/settings.json'), 'utf8'));
  assert.deepStrictEqual(selectiveSettings, { model: 'test' }, 'selective import: only the selected settings.json key is kept');

  // Per-category opt-in fallback: a manifest that only mentions skills: leaves
  // hooks/settings unfiltered (imported in full) — the safety property the design chose
  // over "whole-file-exhaustive" (see
  // docs/superpowers/specs/2026-07-29-manifest-dotfiles-import-design.md).
  const fallbackHome = path.join(tmp, 'fallback-home');
  const fallbackTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(fallbackHome, '.claude') };
  dotfiles.importOne(sourceDir, fallbackTarget, new Set(['skills:demo-skill'])); // no hooks:/settings: lines at all
  assert.ok(!fs.existsSync(path.join(fallbackHome, '.claude/skills/second-skill')), 'per-category opt-in: mentioned category (skills) is filtered');
  assert.ok(fs.existsSync(path.join(fallbackHome, '.claude/hooks/demo-hook')), 'per-category opt-in: unmentioned category (hooks) still imports in full');
  const fallbackSettings = JSON.parse(fs.readFileSync(path.join(fallbackHome, '.claude/settings.json'), 'utf8'));
  assert.deepStrictEqual(fallbackSettings, { model: 'test', theme: 'auto' }, 'per-category opt-in: unmentioned category (settings) still imports in full');

  // Finding #7 (opportunistic): a selective import with the hooks category mentioned but
  // matching nothing must not create an empty hooks/ dir — symmetric with the skills
  // branch above. (Omitting hooks: entirely would hit the per-category opt-in fallback
  // tested above instead — this uses a non-matching hooks: line to stay in the "mentioned
  // but empty" branch.)
  const noHooksHome = path.join(tmp, 'no-hooks-home');
  const noHooksTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(noHooksHome, '.claude') };
  dotfiles.importOne(sourceDir, noHooksTarget, new Set(['skills:demo-skill', 'hooks:nonexistent-hook']));
  assert.ok(
    !fs.existsSync(path.join(noHooksTarget.homeDir, 'hooks')),
    'selective import creates no hooks/ dir when the hooks category is mentioned but matches nothing (finding #7)'
  );

  // Final-review finding: a settings: manifest line matching nothing must not silently
  // truncate settings.json to {} — leave any existing file untouched instead, and warn.
  {
    const typoSourceDir = path.join(tmp, 'typo-source');
    fs.mkdirSync(typoSourceDir, { recursive: true });
    fs.writeFileSync(path.join(typoSourceDir, 'claude-settings.json'), '{"model":"test"}\n');
    const typoHome = path.join(tmp, 'typo-home');
    const typoTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(typoHome, '.claude') };

    const typoLogs = [];
    const origLog = console.log;
    console.log = (...a) => typoLogs.push(a.join(' '));
    dotfiles.importOne(typoSourceDir, typoTarget, new Set(['settings:modle'])); // typo, matches nothing
    console.log = origLog;
    assert.ok(!fs.existsSync(path.join(typoHome, '.claude/settings.json')), 'a settings: manifest line matching nothing does not write an empty settings.json on a fresh machine');
    assert.match(typoLogs.join('\n'), /warning — "settings:modle" .* matches nothing/, 'unmatched manifest line prints a warning');

    // A matching manifest actually writes it...
    dotfiles.importOne(typoSourceDir, typoTarget, new Set(['settings:model']));
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(typoHome, '.claude/settings.json'), 'utf8')), { model: 'test' }, 'sanity: a matching settings: line does write settings.json');

    // ...and a later import with a typo'd manifest must not overwrite that existing file.
    dotfiles.importOne(typoSourceDir, typoTarget, new Set(['settings:modle']));
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(typoHome, '.claude/settings.json'), 'utf8')), { model: 'test' }, 'a subsequent import with an unmatched settings: line leaves the existing settings.json untouched, does not overwrite it to {}');
  }

  // Manifest end-to-end: .ai/claude-import.txt drives `dotfiles import` with no flag at
  // all — presence of the file alone triggers filtering, replacing the old --select flag.
  {
    const manifestFile = dotfiles.importManifestFile(sourceDir, claudeTarget);
    fs.writeFileSync(manifestFile, '# comment lines and blank lines are ignored\n\nskills:demo-skill\nsettings:model\n');

    const manifestHome = path.join(tmp, 'manifest-home');
    await dotfiles.run(['import', '--claude', '--home', manifestHome], sourceDir);

    assert.ok(fs.existsSync(path.join(manifestHome, '.claude/skills/demo-skill')), 'manifest end-to-end: listed skill is materialized');
    assert.ok(!fs.existsSync(path.join(manifestHome, '.claude/skills/second-skill')), 'manifest end-to-end: unlisted skill in a mentioned category is NOT materialized');
    assert.ok(fs.existsSync(path.join(manifestHome, '.claude/hooks/demo-hook')), 'manifest end-to-end: hooks (not mentioned in the manifest) still imports in full');
    const manifestSettings = JSON.parse(fs.readFileSync(path.join(manifestHome, '.claude/settings.json'), 'utf8'));
    assert.deepStrictEqual(manifestSettings, { model: 'test' }, 'manifest end-to-end: only the listed settings.json key is kept');

    // --all bypasses the manifest entirely, even though the file still exists.
    const manifestAllHome = path.join(tmp, 'manifest-all-home');
    await dotfiles.run(['import', '--claude', '--all', '--home', manifestAllHome], sourceDir);
    assert.ok(fs.existsSync(path.join(manifestAllHome, '.claude/skills/second-skill')), '--all bypasses the manifest even when it exists');

    fs.rmSync(manifestFile); // don't leak into later assertions in this file
  }

  // Finding #6 (opportunistic): if importOne throws (e.g. .ai/ only has plugins.json, none
  // of skills/hooks/settings for it to work with), no target home dir should be left behind.
  {
    const throwSourceDir = path.join(tmp, 'throw-source');
    fs.mkdirSync(throwSourceDir, { recursive: true });
    fs.writeFileSync(
      path.join(throwSourceDir, 'plugins.json'),
      JSON.stringify([{ label: 'only-package', installs: [{ agent: 'demo', command: process.execPath, args: ['--version'] }] }])
    );
    const throwHome = path.join(tmp, 'throw-home');
    const throwTarget = { key: 'claude', label: 'Claude Code', homeDir: path.join(throwHome, '.claude') };
    let threw = false;
    try {
      await dotfiles.run(['import', '--claude', '--home', throwHome], throwSourceDir);
    } catch {
      threw = true;
    }
    assert.ok(threw, 'sanity: importOne throws when .ai/ has only plugins.json (no skills/hooks/settings)');
    assert.ok(!fs.existsSync(throwTarget.homeDir), 'a throwing importOne must not leave an empty target home dir behind (finding #6)');
  }

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
      { label: 'demo installer', installs: [{ command: process.execPath, args: ['--version'] }] },
      {
        label: 'shell-demo',
        // a single agent needing two chained CLI calls (marketplace add, then install) is
        // still one step, not two — {shell} instead of a second {command, args} entry
        // Keep the shell form for parser/drift coverage, but make execution offline and
        // side-effect free: the echoed text still contains the Claude install signature
        // consumed by claudeInstallId().
        installs: [{ agent: 'claude', shell: `"${process.execPath}" --version && echo "claude plugin install shell-demo@bar --scope user"` }],
      },
    ])
  );

  // pluginsOne with an explicit selection: only the selected package's install steps run.
  // Capture stdout the same way the later `list`/`tree` tests already do.
  const pluginLogs = [];
  const origLogForPlugins = console.log;
  console.log = (...a) => pluginLogs.push(a.join(' '));
  dotfiles.pluginsOne(sourceDir, { key: 'claude', label: 'Claude Code', homeDir: fakeHome + '/.claude' }, new Set(['plugins:demo installer']));
  console.log = origLogForPlugins;
  const pluginOutput = pluginLogs.join('\n');
  assert.match(pluginOutput, /demo installer/, 'selective plugins: selected package still runs');
  assert.match(
    pluginOutput,
    /skipping shell-demo \(not listed in \.ai\/claude-import\.txt/,
    'selective plugins: unselected package prints a visible skip line instead of silently doing nothing (finding #1)'
  );
  assert.doesNotMatch(
    pluginOutput,
    /claude plugin marketplace add foo\/bar/,
    "selective plugins: unselected package's install steps do not actually run"
  );

  // dotfiles plugins honors the manifest's plugins: lines (per-category opt-in, same
  // mechanism as import); --all bypasses it; a manifest that never mentions plugins:
  // installs everything (the general per-category fallback, not a special case anymore —
  // see docs/superpowers/specs/2026-07-29-manifest-dotfiles-import-design.md).
  {
    const capture = async (fn) => {
      const captured = [];
      const orig = console.log;
      console.log = (...a) => captured.push(a.join(' '));
      try {
        await fn();
      } finally {
        console.log = orig;
      }
      return captured.join('\n');
    };
    const dollarLineCount = (output) => output.split('\n').filter((l) => l.trim().startsWith('$ ')).length;
    const twoPackagesFixture = () => ([
      { label: 'kept-package', installs: [{ command: process.execPath, args: ['--version'] }] },
      { label: 'excluded-package', installs: [{ command: process.execPath, args: ['--version'] }] },
    ]);

    // Case 1: a manifest listing only "plugins:kept-package" — plain `dotfiles plugins`
    // (no flags) honors it: only "kept-package" actually runs its install step.
    const honoredSourceDir = path.join(tmp, 'plugins-source-honored');
    fs.mkdirSync(honoredSourceDir, { recursive: true });
    fs.writeFileSync(path.join(honoredSourceDir, 'plugins.json'), JSON.stringify(twoPackagesFixture()));
    fs.writeFileSync(path.join(honoredSourceDir, 'claude-import.txt'), 'plugins:kept-package\n');
    const honoredHome = path.join(tmp, 'plugins-home-honored');
    const honoredOutput = await capture(() => dotfiles.run(['plugins', '--claude', '--home', honoredHome], honoredSourceDir));
    assert.strictEqual(dollarLineCount(honoredOutput), 1, 'run(plugins): only the listed package actually installs when a manifest mentions plugins:');
    assert.match(honoredOutput, /skipping excluded-package/, 'run(plugins): excluded package prints a skip line');

    // Case 2: --all bypasses the manifest entirely — both packages run.
    const allOutput = await capture(() => dotfiles.run(['plugins', '--claude', '--all', '--home', honoredHome], honoredSourceDir));
    assert.strictEqual(dollarLineCount(allOutput), 2, 'run(plugins --all): manifest is bypassed, both packages install');
    assert.doesNotMatch(allOutput, /skipping/, 'run(plugins --all): no skip line since the manifest is bypassed entirely');

    // Case 3 (per-category opt-in fallback): a manifest that exists but never mentions
    // plugins: at all — e.g. it only curates skills — must install every plugin, not zero.
    const neverMentionedSourceDir = path.join(tmp, 'plugins-source-never-mentioned');
    fs.mkdirSync(neverMentionedSourceDir, { recursive: true });
    fs.writeFileSync(path.join(neverMentionedSourceDir, 'plugins.json'), JSON.stringify(twoPackagesFixture()));
    fs.writeFileSync(path.join(neverMentionedSourceDir, 'claude-import.txt'), 'skills:some-skill\n'); // no plugins: line at all
    const neverMentionedHome = path.join(tmp, 'plugins-home-never-mentioned');
    const neverMentionedOutput = await capture(() => dotfiles.run(['plugins', '--claude', '--home', neverMentionedHome], neverMentionedSourceDir));
    assert.strictEqual(
      dollarLineCount(neverMentionedOutput),
      2,
      'run(plugins): a manifest that never mentions plugins: installs everything, not nothing (per-category opt-in fallback)'
    );
    assert.doesNotMatch(neverMentionedOutput, /skipping/, 'run(plugins): no skip lines when plugins: was never mentioned');
  }

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
  assert.match(treeOutput, /claude-hooks\//, 'tree shows claude-hooks/');
  assert.match(treeOutput, /demo-hook/, 'tree lists hook names');
  assert.match(treeOutput, /demo installer/, 'tree expands plugins.json labels, not just the filename');
  assert.match(treeOutput, /demo installer( \[\])?/, 'tree shows the agent-neutral installer package');

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ok — all checks passed');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
