const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');

// Find the generated client index.d.ts (could be in local node_modules or hoisted)
function findClient() {
  const localPath = path.join(root, 'node_modules', '.prisma', 'client', 'index.d.ts');
  if (fs.existsSync(localPath)) return localPath;

  // npm workspaces may hoist .prisma/client to the repo root
  const repoRootPath = path.join(root, '..', '..', '..', '..', 'node_modules', '.prisma', 'client', 'index.d.ts');
  if (fs.existsSync(repoRootPath)) return repoRootPath;

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
