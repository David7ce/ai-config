'use strict';

const fs = require('fs');
const path = require('path');
const { error, warning, hasErrors } = require('./diagnostics');
const { loadConfig, CONFIG_VERSION } = require('./config-loader');

const KNOWN_INSTALL_AGENTS = new Set(['claude', 'copilot', 'antigravity', 'gemini', 'codex', 'opencode', 'cursor', 'windsurf']);
const INSTALL_KINDS = new Set(['plugin', 'mcp', 'tool', 'setup']);
const INSTALL_SCOPES = new Set(['project', 'user', 'machine']);

function validateConfig(sourceDir) {
  const loaded = loadConfig(sourceDir);
  const { config, diagnostics } = loaded;
  const root = config.sourceDir;
  const add = (item) => diagnostics.push(item);

  if (config.version !== CONFIG_VERSION) add(error('UNSUPPORTED_VERSION', `Unsupported configuration version: ${config.version}`, root));
  for (const agent of config.agents) {
    const metadataFile = path.join(root, 'agents', `${agent.id}.json`);
    if (!fs.existsSync(metadataFile)) add(warning('MISSING_AGENT_METADATA', `Agent has no metadata sidecar: ${agent.id}`, agent.source));
    if (agent.metadata.workflow) {
      const workflow = path.join(root, agent.metadata.workflow);
      if (!fs.existsSync(workflow)) add(error('MISSING_REFERENCE', `Agent workflow does not exist: ${agent.metadata.workflow}`, agent.source, 'workflow'));
    }
  }
  for (const prompt of config.prompts) {
    if (!prompt.metadata.description) add(warning('MISSING_DESCRIPTION', `Prompt has no description: ${prompt.id}`, prompt.source, 'description'));
    if (prompt.metadata.checklist && !fs.existsSync(path.join(root, prompt.metadata.checklist))) {
      add(error('MISSING_REFERENCE', `Prompt checklist does not exist: ${prompt.metadata.checklist}`, prompt.source, 'checklist'));
    }
  }
  for (const [name, server] of Object.entries(config.mcpServers)) {
    if (!server || typeof server !== 'object' || (!server.command && !server.url)) {
      add(error('INVALID_MCP_SERVER', `MCP server must define command or url: ${name}`, 'mcp-servers.json', name));
    }
  }
  for (const [index, installation] of config.installations.entries()) {
    if (!installation || typeof installation !== 'object' || !installation.label || !Array.isArray(installation.installs)) {
      add(error('INVALID_INSTALLATION', `Installation ${index + 1} requires label and installs[]`, 'plugins.json'));
      continue;
    }
    if (installation.kind && !INSTALL_KINDS.has(installation.kind)) {
      add(error('INVALID_INSTALL_KIND', `Unsupported installation kind: ${installation.kind}`, 'plugins.json', installation.label));
    }
    if (installation.scope && !INSTALL_SCOPES.has(installation.scope)) {
      add(error('INVALID_INSTALL_SCOPE', `Unsupported installation scope: ${installation.scope}`, 'plugins.json', installation.label));
    }
    for (const [stepIndex, step] of installation.installs.entries()) {
      if (!step || typeof step !== 'object' || (!step.command && !step.shell)) {
        add(error('INVALID_INSTALL_STEP', `Installation ${installation.label} step ${stepIndex + 1} requires command or shell`, 'plugins.json'));
      } else if (step.agent && !KNOWN_INSTALL_AGENTS.has(step.agent)) {
        add(error('INVALID_INSTALL_AGENT', `Unsupported installation agent: ${step.agent}`, 'plugins.json', installation.label));
      }
    }
  }
  for (const [target, lines] of Object.entries(config.manifests)) {
    for (const line of lines.filter((item) => !item.startsWith('#'))) {
      if (!/^[a-z][a-z0-9-]*:.+$/.test(line)) add(error('INVALID_MANIFEST_LINE', `Invalid manifest entry: ${line}`, `${target}-import.txt`));
    }
  }
  return { config, diagnostics, valid: !hasErrors(diagnostics) };
}

module.exports = { validateConfig };