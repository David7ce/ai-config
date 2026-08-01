'use strict';

const fs = require('fs');
const path = require('path');
const { error, warning } = require('./diagnostics');

const CONFIG_VERSION = 1;

function exists(file) {
  return fs.existsSync(file);
}

function readJson(file, diagnostics, fallback) {
  if (!exists(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (cause) {
    diagnostics.push(error('INVALID_JSON', `Invalid JSON: ${cause.message}`, file));
    return fallback;
  }
}

function parseFrontmatter(raw, file, diagnostics) {
  const metadata = {};
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata, body: raw };
  let lastKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim()) continue;
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) {
      // Keep the dependency-free parser compatible with the multiline descriptions
      // commonly used by SKILL.md files. This is a folded scalar approximation; the
      // canonical YAML parser can be introduced later without changing the loader API.
      if (lastKey && /^\s+/.test(line)) metadata[lastKey] = `${metadata[lastKey]} ${line.trim()}`.trim();
      else diagnostics.push(warning('INVALID_FRONTMATTER_LINE', `Cannot parse frontmatter line: ${line}`, file));
      continue;
    }
    metadata[pair[1]] = pair[2].trim().replace(/^"(.*)"$/, '$1');
    lastKey = pair[1];
  }
  return { metadata, body: raw.slice(match[0].length) };
}

function filesWithExtension(dir, extension) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith(extension)).sort();
}

function loadConfig(sourceDir) {
  const root = path.resolve(sourceDir);
  const diagnostics = [];
  const config = {
    version: CONFIG_VERSION,
    sourceDir: root,
    instructions: [],
    skills: { core: [], projects: [], personal: [] },
    agents: [],
    prompts: [],
    mcpServers: {},
    installations: [],
    targetSettings: {},
    manifests: {},
  };

  if (!exists(root)) {
    diagnostics.push(error('SOURCE_NOT_FOUND', `Configuration directory does not exist: ${root}`, root));
    return { config, diagnostics };
  }

  const instructionFile = path.join(root, 'instructions.md');
  if (exists(instructionFile)) config.instructions.push({ id: 'instructions', source: 'instructions.md' });
  for (const name of filesWithExtension(path.join(root, 'skills', 'core'), '.md')) {
    config.skills.core.push({ id: name.replace(/\.md$/, ''), source: path.join('skills', 'core', name) });
  }

  for (const scope of ['projects', 'personal']) {
    const dir = path.join(root, 'skills', scope);
    if (!exists(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      const skillDir = path.join(dir, name);
      if (!fs.statSync(skillDir).isDirectory()) continue;
      const skillFiles = filesWithExtension(skillDir, '.md');
      for (const file of skillFiles) {
        const source = path.join('skills', scope, name, file);
        const parsed = parseFrontmatter(fs.readFileSync(path.join(skillDir, file), 'utf8'), path.join(root, source), diagnostics);
        config.skills[scope].push({ id: `${name}/${file.replace(/\.md$/, '')}`, name, source, metadata: parsed.metadata });
      }
    }
  }

  const agentsDir = path.join(root, 'agents');
  for (const name of filesWithExtension(agentsDir, '.md')) {
    const id = name.replace(/\.md$/, '');
    const source = path.join('agents', name);
    const metadataFile = path.join(agentsDir, `${id}.json`);
    config.agents.push({ id, source, metadata: readJson(metadataFile, diagnostics, {}) });
  }

  const promptsDir = path.join(root, 'prompts');
  for (const name of filesWithExtension(promptsDir, '.md').filter((item) => !item.endsWith('.prompt.md'))) {
    const source = path.join('prompts', name);
    const parsed = parseFrontmatter(fs.readFileSync(path.join(promptsDir, name), 'utf8'), path.join(root, source), diagnostics);
    config.prompts.push({ id: name.replace(/\.md$/, ''), source, metadata: parsed.metadata });
  }

  config.mcpServers = readJson(path.join(root, 'mcp-servers.json'), diagnostics, {});
  config.installations = readJson(path.join(root, 'plugins.json'), diagnostics, []);

  if (!Array.isArray(config.installations)) {
    diagnostics.push(error('INVALID_INSTALLATIONS', 'plugins.json must contain an array', path.join(root, 'plugins.json')));
    config.installations = [];
  }
  for (const file of filesWithExtension(root, '-settings.json')) {
    const target = file.replace(/-settings\.json$/, '');
    config.targetSettings[target] = readJson(path.join(root, file), diagnostics, {});
  }
  for (const file of fs.readdirSync(root).filter((name) => name.endsWith('-import.txt')).sort()) {
    const target = file.replace(/-import\.txt$/, '');
    config.manifests[target] = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  }

  return { config, diagnostics };
}

module.exports = { CONFIG_VERSION, loadConfig, parseFrontmatter };