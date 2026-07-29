'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

// Shared by wrap.js and dotfiles.js: numbered menu, no arrow-key TUI dependency — plain
// readline is correct on every terminal at zero extra installs (Windows raw-mode is a
// real footgun for arrow-key pickers). `items` need only `key` and `label`; `extra` is an
// optional third column (a path, usually).
function pickFromMenu(items, header) {
  console.log(`\n${header} (detected OS: ${process.platform}, home: ${os.homedir()})\n`);
  items.forEach((it, i) =>
    console.log(`  ${String(i + 1).padStart(2)}) ${it.label.padEnd(18)} ${it.extra || ''}`)
  );
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question('\nNumbers separated by spaces/commas, "a" for all, Enter to cancel: ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (!trimmed) return resolve(new Set());
      if (trimmed === 'a' || trimmed === 'all') return resolve(new Set(items.map((it) => it.key)));
      const picked = new Set();
      for (const tok of trimmed.split(/[\s,]+/)) {
        const item = items[parseInt(tok, 10) - 1];
        if (item) picked.add(item.key);
      }
      resolve(picked);
    });
  });
}

function write(targetDir, relPath, content) {
  const full = path.join(targetDir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
  return relPath;
}

// Mirror src into dst: dst ends up an exact copy of src (extras in dst are deleted).
function mirrorDir(src, dst) {
  if (!fs.existsSync(src)) return false;
  fs.rmSync(dst, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  return true;
}

module.exports = { write, mirrorDir, pickFromMenu };
