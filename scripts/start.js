const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const dbDir = path.join(root, 'farm server', 'packages', 'server', 'database');

function run(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { cwd: opts.cwd || root, stdio: 'inherit', shell: true, ...opts });
  child.on('error', (err) => console.error(`[${label}] error:`, err.message));
  child.on('exit', (code) => console.log(`[${label}] exited with code ${code}`));
  return child;
}

async function main() {
  // 1. Run prisma migrate deploy
  console.log('\n=== Running Prisma migrations ===');
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { cwd: dbDir, stdio: 'inherit' });
    console.log('Migrations applied successfully.');
  } catch (e) {
    console.warn('prisma migrate deploy failed — continuing anyway...');
  }

  // 2. Start all services
  console.log('\n=== Starting services ===');

  run('api-gateway', 'node', ['dist/main'], { cwd: path.join(root, 'farm server', 'api-gateway') });
  run('app-server', 'node', ['dist/main'], { cwd: path.join(root, 'farm server', 'app-server') });
  run('console', 'npx', ['next', 'start', '-p', '4002'], { cwd: path.join(root, 'farm client', 'console') });
  run('admin', 'npx', ['next', 'start', '-p', '4003'], { cwd: path.join(root, 'farm client', 'admin') });
  run('web', 'npx', ['next', 'start', '-p', '4004'], { cwd: path.join(root, 'farm client', 'web') });

  console.log('\nAll services started.');
}

main();
