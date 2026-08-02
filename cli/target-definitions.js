'use strict';

const { createClaudeAdapter } = require('../adapters/claude');

// Built-in target declarations. Adapters own target-specific behavior; this module keeps
// the remaining built-ins together temporarily while extraction proceeds incrementally.
function createTargetDefinitions(renderers) {
  const {
    genClaude,
    genAgentsMd,
    genGemini,
    genAntigravity,
    genCursor,
    genWindsurf,
    genCopilot,
    genMcp,
    genClaudeAgent,
    genOpencodeAgent,
    genGithubAgent,
    genPromptFile,
    materializeClaudeSkills,
    copilotBespokePrompts,
    write,
    writeFresh,
  } = renderers;

  return [
    createClaudeAdapter({ renderers }),
    {
      key: 'codex', label: 'Codex', file: 'AGENTS.md',
      capabilities: { instructions: true },
      generate: (src, targetDir) => [write(targetDir, 'AGENTS.md', genAgentsMd(src))],
    },
    {
      key: 'opencode', label: 'opencode', file: 'AGENTS.md + .opencode/agents, .opencode/commands',
      capabilities: { instructions: true, agents: true, prompts: true },
      generate: (src, targetDir, sourceDir, sourceConfig) => [
        write(targetDir, 'AGENTS.md', genAgentsMd(src)),
        ...writeFresh(targetDir, '.opencode/agents', sourceConfig.agents.map((a) => [`${a.id}.md`, genOpencodeAgent({ name: a.id, meta: a.metadata })])),
        ...writeFresh(targetDir, '.opencode/commands', sourceConfig.prompts.map((p) => [`${p.id}.md`, genPromptFile({ name: p.id, meta: p.metadata }, { agentBinding: true })])),
      ],
    },
    { key: 'gemini', label: 'Gemini CLI', file: 'GEMINI.md', capabilities: { instructions: true }, generate: (src, targetDir) => [write(targetDir, 'GEMINI.md', genGemini())] },
    { key: 'antigravity', label: 'Antigravity CLI', file: '.agents/AGENTS.md', capabilities: { instructions: true }, generate: (src, targetDir) => [write(targetDir, '.agents/AGENTS.md', genAntigravity(src))] },
    { key: 'cursor', label: 'Cursor', file: '.cursor/rules/project.mdc', capabilities: { instructions: true }, generate: (src, targetDir) => [write(targetDir, '.cursor/rules/project.mdc', genCursor(src))] },
    { key: 'windsurf', label: 'Windsurf', file: '.windsurfrules', capabilities: { instructions: true }, generate: (src, targetDir) => [write(targetDir, '.windsurfrules', genWindsurf(src))] },
    {
      key: 'copilot', label: 'GitHub Copilot CLI', file: '.github/copilot-instructions.md',
      capabilities: { instructions: true, agents: true, prompts: true },
      generate: (src, targetDir, sourceDir, sourceConfig) => [
        write(targetDir, '.github/copilot-instructions.md', genCopilot(src)),
        ...writeFresh(targetDir, '.github/agents', sourceConfig.agents.map((a) => [`${a.id}.agent.md`, genGithubAgent({ name: a.id, meta: a.metadata })])),
        ...writeFresh(targetDir, '.github/prompts', [
          ...sourceConfig.prompts.map((p) => [`${p.id}.prompt.md`, genPromptFile({ name: p.id, meta: p.metadata }, { command: true })]),
          ...copilotBespokePrompts(sourceDir),
        ]),
      ],
    },
    { key: 'mcp', label: 'MCP servers', file: '.mcp.json + .vscode/mcp.json', capabilities: { mcp: true }, generate: (src, targetDir, sourceDir, sourceConfig) => genMcp(targetDir, sourceConfig) },
  ];
}

module.exports = { createTargetDefinitions };