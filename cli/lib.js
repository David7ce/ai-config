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

// Tri-state: every item in a category selected -> 'all'; none -> 'none'; otherwise 'some'.
function triState(itemKeys, selected) {
  const selectedCount = itemKeys.filter((k) => selected.has(k)).length;
  if (selectedCount === 0) return 'none';
  if (selectedCount === itemKeys.length) return 'all';
  return 'some';
}

const TRI_STATE_MARK = { all: '[x]', none: '[ ]', some: '[~]' };

// Flattens categories into numbered rows (one per category, one per item, indented) and an
// index from displayed number back to the item key(s) it toggles — the pure half of
// pickTriState, kept separate so the toggle math is unit-testable without touching stdin.
// ASCII marks only (not Unicode) so output is correct regardless of terminal codepage.
function renderMenu(categories, selected) {
  const lines = [];
  const index = new Map(); // number -> { itemKeys: string[] }
  let n = 0;
  for (const cat of categories) {
    const itemKeys = cat.items.map((it) => `${cat.key}:${it.key}`);
    n++;
    index.set(n, { itemKeys });
    lines.push(`  ${String(n).padStart(2)}) ${TRI_STATE_MARK[triState(itemKeys, selected)]} ${cat.label}`);
    for (const it of cat.items) {
      const key = `${cat.key}:${it.key}`;
      n++;
      index.set(n, { itemKeys: [key] });
      lines.push(`  ${String(n).padStart(2)})   ${selected.has(key) ? TRI_STATE_MARK.all : TRI_STATE_MARK.none} ${it.label}`);
    }
  }
  return { lines, index };
}

// Toggling a category row flips ALL its items together: if every item is currently
// selected, deselect them all; otherwise ('none' or 'some') select them all. Toggling an
// item row flips just that one key. Always returns a new Set — never mutates `selected`.
function toggle(selected, index, num) {
  const entry = index.get(num);
  if (!entry) return selected;
  const next = new Set(selected);
  if (entry.itemKeys.length > 1) {
    const allSelected = entry.itemKeys.every((k) => next.has(k));
    for (const k of entry.itemKeys) (allSelected ? next.delete(k) : next.add(k));
  } else {
    const [key] = entry.itemKeys;
    next.has(key) ? next.delete(key) : next.add(key);
  }
  return next;
}

// Tri-state category/item picker: same readline-only approach as pickFromMenu (no
// arrow-key raw-mode — see its comment). Category numbers toggle every item under them at
// once; item numbers toggle just that one. Starts fully selected so pressing Enter alone
// reproduces "bring everything." {input, output} default to the real terminal; tests
// inject a scripted stream instead.
function pickTriState(categories, header, { input = process.stdin, output = process.stdout } = {}) {
  let selected = new Set(categories.flatMap((c) => c.items.map((it) => `${c.key}:${it.key}`)));
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => {
    const prompt = () => {
      const { lines, index } = renderMenu(categories, selected);
      output.write(`\n${header}\n\n${lines.join('\n')}\n`);
      rl.question(
        '\nNumbers to toggle (categories or items, space/comma separated), "a" all, "n" none, Enter to confirm: ',
        (answer) => {
          const trimmed = answer.trim().toLowerCase();
          if (!trimmed) {
            rl.close();
            return resolve(selected);
          }
          if (trimmed === 'a' || trimmed === 'all') {
            selected = new Set(categories.flatMap((c) => c.items.map((it) => `${c.key}:${it.key}`)));
          } else if (trimmed === 'n' || trimmed === 'none') {
            selected = new Set();
          } else {
            for (const tok of trimmed.split(/[\s,]+/)) selected = toggle(selected, index, parseInt(tok, 10));
          }
          prompt();
        }
      );
    };
    prompt();
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

module.exports = { write, mirrorDir, pickFromMenu, triState, renderMenu, toggle, pickTriState };
