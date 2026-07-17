'use strict';
const fs = require('fs');
const path = require('path');

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

module.exports = { write, mirrorDir };
