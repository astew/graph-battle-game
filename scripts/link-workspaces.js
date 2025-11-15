const fs = require('node:fs');
const path = require('node:path');

const packages = [
  { name: '@graph-battle/core', dir: path.join(__dirname, '..', 'packages', 'core') },
  { name: '@graph-battle/bots', dir: path.join(__dirname, '..', 'packages', 'bots') },
  { name: '@graph-battle/simulator', dir: path.join(__dirname, '..', 'packages', 'simulator') }
];

const nodeModulesRoot = path.join(__dirname, '..', 'node_modules');
const scopeDir = path.join(nodeModulesRoot, '@graph-battle');

fs.mkdirSync(scopeDir, { recursive: true });

for (const pkg of packages) {
  const linkLocation = path.join(scopeDir, pkg.name.split('/')[1]);
  try {
    const existing = fs.readlinkSync(linkLocation);
    if (existing === pkg.dir) {
      continue;
    }
    fs.rmSync(linkLocation, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  fs.symlinkSync(pkg.dir, linkLocation, 'junction');
}
