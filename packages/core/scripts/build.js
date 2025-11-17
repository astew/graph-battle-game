const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }

  fs.copyFileSync(src, dest);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const entry of fs.readdirSync(srcDir)) {
  copyRecursive(path.join(srcDir, entry), path.join(distDir, entry));
}
