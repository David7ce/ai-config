#!/usr/bin/env node
'use strict';
// ai-config — router. `wrap` (default) generates per-tool project config from .ai/.
// `dotfiles` applies this machine's slice of .ai/ (settings, hooks, personal skills,
// plugins) to the real user config for that agent — see cli/dotfiles.js for the shape.
const path = require('path');
const wrap = require('./wrap');
const dotfiles = require('./dotfiles');
const { validateConfig } = require('../core/config-validator');
const { cleanup, formatCleanup, parseDays } = require('../core/cleanup');

function printDiagnostics(diagnostics) {
  for (const item of diagnostics) {
    const location = [item.file, item.field].filter(Boolean).join('#');
    console.log(`${item.severity.toUpperCase()} ${item.code}${location ? ` ${location}` : ''}: ${item.message}`);
  }
}

function runCleanup(argv) {
  const agents = [];
  let home = require('os').homedir();
  let olderThanDays = 30;
  let apply = false;
  let includeFileHistory = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--agent') agents.push(...argv[++i].split(',').map((value) => value.trim()).filter(Boolean));
    else if (argv[i] === '--home') home = argv[++i];
    else if (argv[i] === '--older-than') olderThanDays = parseDays(argv[++i]);
    else if (argv[i] === '--apply') apply = true;
    else if (argv[i] === '--include-file-history') includeFileHistory = true;
    else throw new Error(`Unknown clean option: ${argv[i]}`);
  }
  const result = cleanup(path.resolve(home), { agents: agents.length ? agents : undefined, olderThanDays, apply, includeFileHistory });
  console.log(formatCleanup(result));
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'clean') {
    runCleanup(argv.slice(1));
  } else if (argv[0] === 'validate') {
    const sourceIndex = argv.indexOf('--source');
    const sourceDir = path.resolve(sourceIndex >= 0 ? argv[sourceIndex + 1] : path.join(process.cwd(), '.ai'));
    const result = validateConfig(sourceDir);
    printDiagnostics(result.diagnostics);
    if (result.valid) console.log(`Valid AI Config: ${sourceDir}`);
    if (!result.valid) process.exitCode = 1;
  } else if (argv[0] === 'dotfiles') {
    const defaultSourceDir = path.join(__dirname, '..', '.ai'); // .ai/ next to this CLI
    await dotfiles.run(argv.slice(1), defaultSourceDir);
  } else {
    await wrap.run(argv[0] === 'wrap' ? argv.slice(1) : argv);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
