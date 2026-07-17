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
  fs.mkdirSync(path.join(sourceDir, 'workflows'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'claude/project/agents'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'claude/project/commands'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'opencode/project/agents'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'opencode/project/commands'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'instructions.md'), '# Test instructions\n');
  fs.writeFileSync(path.join(sourceDir, 'skills/core/foo.md'), '# foo\n');
  fs.writeFileSync(path.join(sourceDir, 'skills/projects/demo/bar.md'), '# bar\n');
  fs.writeFileSync(path.join(sourceDir, 'workflows/baz.md'), '# baz\n');
  fs.writeFileSync(
    path.join(sourceDir, 'claude/project/agents/DemoAgent.md'),
    '---\nname: DemoAgent\nmodel: sonnet\n---\n\nDemo agent body.\n'
  );
  fs.writeFileSync(
    path.join(sourceDir, 'claude/project/commands/demo-cmd.md'),
    '---\ndescription: "Demo command"\n---\n\nDemo command body.\n'
  );
  fs.writeFileSync(
    path.join(sourceDir, 'opencode/project/agents/DemoAgent.md'),
    '---\nmode: subagent\nmodel: anthropic/demo\n---\n\nDemo agent body.\n'
  );
  fs.writeFileSync(
    path.join(sourceDir, 'opencode/project/commands/demo-cmd.md'),
    '---\ndescription: "Demo command"\n---\n\nDemo command body.\n'
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

  // pre-seed a stale file where wrap's Claude wrapper-mirror will write, to prove the
  // mirror actually deletes destination extras instead of just adding on top
  fs.mkdirSync(path.join(targetDir, '.claude/agents'), { recursive: true });
  fs.writeFileSync(path.join(targetDir, '.claude/agents/Stale.md'), 'should be gone after wrap\n');

  await wrap.run(['--all', '--source', sourceDir, '--target', targetDir]);

  const claude = fs.readFileSync(path.join(targetDir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /@\.ai\/instructions\.md/, 'CLAUDE.md imports instructions.md');
  assert.match(claude, /@\.ai\/skills\/core\/foo\.md/, 'CLAUDE.md imports core skill');
  assert.match(claude, /@\.ai\/skills\/projects\/demo\/bar\.md/, 'CLAUDE.md imports project skill');

  const demoAgent = fs.readFileSync(path.join(targetDir, '.claude/agents/DemoAgent.md'), 'utf8');
  assert.match(demoAgent, /model: sonnet/, '.claude/agents/ copied verbatim from .ai/claude/project/agents/');
  const demoCmd = fs.readFileSync(path.join(targetDir, '.claude/commands/demo-cmd.md'), 'utf8');
  assert.match(demoCmd, /Demo command/, '.claude/commands/ copied verbatim from .ai/claude/project/commands/');
  assert.ok(
    !fs.existsSync(path.join(targetDir, '.claude/agents/Stale.md')),
    'wrapper mirror deletes destination extras (Stale.md removed, not left behind)'
  );

  const agents = fs.readFileSync(path.join(targetDir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /`\.ai\/workflows\/baz\.md`/, 'AGENTS.md references the workflow');

  const ocAgent = fs.readFileSync(path.join(targetDir, '.opencode/agents/DemoAgent.md'), 'utf8');
  assert.match(ocAgent, /mode: subagent/, '.opencode/agents/ copied verbatim from .ai/opencode/project/agents/');
  const ocCmd = fs.readFileSync(path.join(targetDir, '.opencode/commands/demo-cmd.md'), 'utf8');
  assert.match(ocCmd, /Demo command/, '.opencode/commands/ copied verbatim from .ai/opencode/project/commands/');

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
  fs.mkdirSync(path.join(sourceDir, 'claude/home/skills/demo-skill'), { recursive: true });
  fs.mkdirSync(path.join(sourceDir, 'claude/home/hooks'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'claude/home/skills/demo-skill/SKILL.md'), '# demo\n');
  fs.writeFileSync(path.join(sourceDir, 'claude/home/hooks/demo-hook'), '#!/bin/bash\necho hi\n');
  fs.writeFileSync(path.join(sourceDir, 'claude/home/settings.json'), '{"model":"test"}\n');
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

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ok — all checks passed');
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
