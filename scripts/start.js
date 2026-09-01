const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const dbDir = path.join(root, 'farm-server', 'packages', 'server', 'database');
const appServerDir = path.join(root, 'farm-server', 'app-server');

const isDev = process.argv.includes('--dev');
const isWindows = process.platform === 'win32';

function run(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd || root,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
    ...opts,
  });
  child.on('error', (err) => console.error(`[${label}] error:`, err.message));
  child.on('exit', (code) => console.log(`[${label}] exited with code ${code}`));
  return child;
}

async function main() {
  if (!process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004';
  if (!process.env.SERVICE_SECRET) process.env.SERVICE_SECRET = 'fms-service-secret-key-change-in-production';

  const mode = isDev ? 'DEV' : 'PROD';
  console.log(`\n=== Starting FMS in ${mode} mode ===`);

  console.log('\n=== Running Prisma migrations ===');
  try {
    execSync('npx prisma migrate deploy', { cwd: dbDir, stdio: 'inherit' });
    console.log('Migrations applied successfully.');
  } catch (e) {
    console.warn('prisma migrate deploy failed — continuing anyway...');
  }

  if (!isDev) {
    console.log('\n=== Building Microservices ===');
    try {
      execSync('npm run build -w @farm/domain-core && npm run build -w @farm/types-server && npm run build -w @farm/env && npm run build -w @farm/utils && npm run build -w @farm/validation-server && npm run build -w @farm/auth-server && npm run build -w @farm/database', { cwd: root, stdio: 'inherit' });
      execSync('npm run build', { cwd: appServerDir, stdio: 'inherit' });
      console.log('All microservices built successfully.');
    } catch (e) {
      console.warn('build failed — continuing anyway...');
    }
  } else {
    console.log('\n=== Skipping build (dev mode) ===');
  }

  console.log('\n=== Starting Microservices ===');

  if (isDev) {
    run('app-server', 'npm', ['run', 'dev:all'], { cwd: appServerDir });
  } else {
    run('app-server', 'npm', ['run', 'start:all'], { cwd: appServerDir });
  }

  console.log('\n=== Starting Frontend Apps ===');
  if (isDev) {
    run('console', 'npx', ['next', 'dev', '-p', '3001'], { cwd: path.join(root, 'farm-client', 'console') });
    run('admin', 'npx', ['next', 'dev', '-p', '3002'], { cwd: path.join(root, 'farm-client', 'admin') });
  } else {
    run('console', 'npx', ['next', 'start', '-p', '3001'], { cwd: path.join(root, 'farm-client', 'console') });
    run('admin', 'npx', ['next', 'start', '-p', '3002'], { cwd: path.join(root, 'farm-client', 'admin') });
  }

  console.log('\nAll services started.');
  console.log(`\nMode: ${mode}`);
  console.log('\nMicroservices (HTTP):');
  console.log('  - App Server:  http://localhost:4000');
  console.log('\nFrontend:');
  console.log('  - Console:     http://localhost:3001');
  console.log('  - Admin:       http://localhost:3002');
  console.log(`\nAPI Gateway (public entry): http://localhost:4000`);
}
main();
