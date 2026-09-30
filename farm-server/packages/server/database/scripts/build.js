const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');

// Find the generated client index.d.ts (could be in local node_modules or hoisted).
// A real generated client always has schema.prisma copied next to it; the stub that
// @prisma/client ships (and its postinstall leaves behind when no schema is found)
// only has index.d.ts, so require both to avoid mistaking the stub for a real client.
function findClient() {
  const dirs = [
    path.join(root, 'node_modules', '.prisma', 'client'),
    // npm workspaces hoist .prisma/client to the workspace root (farm-server)
    path.join(root, '..', '..', '..', 'node_modules', '.prisma', 'client'),
  ];
  for (const dir of dirs) {
    if (fs.existsSync(path.join(dir, 'index.d.ts')) && fs.existsSync(path.join(dir, 'schema.prisma'))) {
      return path.join(dir, 'index.d.ts');
    }
  }
  return null;
}

const clientPath = findClient();
const needsGenerate = !clientPath || fs.statSync(schemaPath).mtimeMs > fs.statSync(clientPath).mtimeMs;

if (needsGenerate) {
  console.log('Generating Prisma client...');
  try {
    execSync('npx prisma generate', { cwd: root, stdio: 'inherit' });
  } catch (e) {
    if (clientPath) {
      console.warn('prisma generate failed but client exists, continuing with tsc...');
    } else {
      throw e;
    }
  }
} else {
  console.log('Prisma client up to date, skipping generate.');
}

execSync('npx tsc', { cwd: root, stdio: 'inherit' });
