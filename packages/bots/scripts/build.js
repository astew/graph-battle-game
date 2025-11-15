const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

for (const entry of fs.readdirSync(srcDir)) {
  const srcPath = path.join(srcDir, entry);
  const distPath = path.join(distDir, entry);
  fs.copyFileSync(srcPath, distPath);
}
