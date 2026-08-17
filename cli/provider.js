#!/usr/bin/env node
// Switches which model-provider profile .ai/claude-settings.json's `model` + `env`
// use, without touching the file's other keys (hooks, enabledPlugins, ...).
// Profiles are defined in .ai/model-providers.json. After switching, run
// `node cli/index.js dotfiles import` to apply the change to ~/.claude/settings.json.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PROVIDERS_PATH = path.join(ROOT, ".ai", "model-providers.json");
const SETTINGS_PATH = path.join(ROOT, ".ai", "claude-settings.json");

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function listProfiles(profiles) {
  console.log("Available model-provider profiles:\n");
  for (const p of profiles) {
    console.log(`  ${p.label}`);
    console.log(`    ${p.description}\n`);
  }
}

function currentEnv() {
  const settings = loadJson(SETTINGS_PATH);
  console.log(`model: ${settings.model || "(unset)"}`);
  console.log("env:", JSON.stringify(settings.env || {}, null, 2));
}

function useProfile(profiles, label) {
  const profile = profiles.find((p) => p.label === label);
  if (!profile) {
    console.error(`No profile named "${label}". Run "list" to see options.`);
    process.exitCode = 1;
    return;
  }

  const settings = loadJson(SETTINGS_PATH);
  settings.model = profile.model;
  settings.env = profile.env;
  writeJson(SETTINGS_PATH, settings);

  console.log(`Switched .ai/claude-settings.json to "${label}".`);
  const placeholders = Object.entries(profile.env).filter(([, v]) =>
    /your-|example\.com|-here$/.test(v)
  );
  if (placeholders.length) {
    console.log("\nFill in these placeholders before using it:");
    for (const [k, v] of placeholders) console.log(`  ${k} = ${v}`);
  }
  console.log('\nThen run: node cli/index.js dotfiles import');
}

function main() {
  const [, , command, arg] = process.argv;
  const profiles = loadJson(PROVIDERS_PATH);

  if (command === "list" || !command) {
    listProfiles(profiles);
  } else if (command === "current") {
    currentEnv();
  } else if (command === "use" && arg) {
    useProfile(profiles, arg);
  } else {
    console.log("Usage: node cli/provider.js list | current | use <label>");
    process.exitCode = 1;
  }
}

main();
