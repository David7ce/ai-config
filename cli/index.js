#!/usr/bin/env node
'use strict';
// ai-config — router. `wrap` (default) generates per-tool project config from .ai/.
// `dotfiles` applies this machine's slice of .ai/ (settings, hooks, personal skills,
// plugins) to the real user config for that agent — see cli/dotfiles.js for the shape.
const path = require('path');
const wrap = require('./wrap');
const dotfiles = require('./dotfiles');
const { validateConfig } = require('../core/config-validator');

function printDiagnostics(diagnostics) {
  for (const item of diagnostics) {
    const location = [item.file, item.field].filter(Boolean).join('#');
    console.log(`${item.severity.toUpperCase()} ${item.code}${location ? ` ${location}` : ''}: ${item.message}`);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'validate') {
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
