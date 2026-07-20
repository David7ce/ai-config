#!/usr/bin/env node
'use strict';
// ai-config — router. `wrap` (default) generates per-tool project config from .ai/.
// `dotfiles` applies this machine's slice of .ai/ (settings, hooks, personal skills,
// plugins) to the real user config for that agent — see cli/dotfiles.js for the shape.
const path = require('path');
const wrap = require('./wrap');
const dotfiles = require('./dotfiles');

async function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === 'dotfiles') {
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
