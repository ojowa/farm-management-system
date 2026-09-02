const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverDir = path.join(root, 'farm-server');

console.log('=== Building farm-server ===');
execSync('npm run build', { cwd: serverDir, stdio: 'inherit' });

console.log('\n=== Removing devDependencies ===');
execSync('npm prune --production', { cwd: serverDir, stdio: 'inherit' });

console.log('\n=== Cleaning npm cache ===');
execSync('npm cache clean --force', { cwd: serverDir, stdio: 'inherit' });

// Remove unnecessary files
const removePatterns = [
  'app-server/src',
  'packages/*/src',
  '**/*.ts',
  '**/*.map',
  '**/__tests__',
  '**/tests',
  '**/*.test.js',
  '**/*.spec.js',
  '.gitignore',
  'tsconfig*.json',
  'nest-cli.json',
];

console.log('\n=== Removing source files ===');
for (const pkg of fs.readdirSync(path.join(serverDir, 'packages', 'server'))) {
  const srcDir = path.join(serverDir, 'packages', 'server', pkg, 'src');
  if (fs.existsSync(srcDir)) {
    fs.rmSync(srcDir, { recursive: true, force: true });
    console.log(`  Removed packages/server/${pkg}/src`);
  }
}

const appSrc = path.join(serverDir, 'app-server', 'src');
if (fs.existsSync(appSrc)) {
  fs.rmSync(appSrc, { recursive: true, force: true });
  console.log('  Removed app-server/src');
}

// Report final size
const size = execSync(`powershell -Command "(Get-ChildItem '${serverDir}' -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB"`, { encoding: 'utf-8' });
console.log(`\n=== Final size: ${Math.round(parseFloat(size.trim()))}MB ===`);
