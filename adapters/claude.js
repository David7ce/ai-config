'use strict';

function createClaudeAdapter({ renderers }) {
  const { genClaude, genClaudeAgent, genPromptFile, materializeClaudeSkills, write, writeFresh } = renderers;
  return {
    key: 'claude',
    label: 'Claude Code',
    file: 'CLAUDE.md',
    capabilities: { instructions: true, skills: true, agents: true, prompts: true, mcp: true },
    generate: (src, targetDir, sourceDir, sourceConfig) => [
      write(targetDir, 'CLAUDE.md', genClaude(src)),
      ...writeFresh(targetDir, '.claude/agents', sourceConfig.agents.map((agent) => [
        `${agent.id}.md`,
        genClaudeAgent({ name: agent.id, meta: agent.metadata }),
      ])),
      ...writeFresh(targetDir, '.claude/commands', sourceConfig.prompts.map((prompt) => [
        `${prompt.id}.md`,
        genPromptFile({ name: prompt.id, meta: prompt.metadata }),
      ])),
      ...materializeClaudeSkills(sourceDir, targetDir, src),
    ],
  };
}

module.exports = { createClaudeAdapter };