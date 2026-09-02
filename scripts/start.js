const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const clientDir = path.join(root, 'farm-client');
const serverDir = path.join(root, 'farm-server');
const dbDir = path.join(serverDir, 'packages', 'server', 'database');
const appServerDir = path.join(serverDir, 'app-server');

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
  if (!process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = 'http://localhost:4002,http://localhost:4003,http://localhost:8082';
  if (!process.env.SERVICE_SECRET) {
    console.error('ERROR: SERVICE_SECRET environment variable is required. Set it in farm-server/.env');
    process.exit(1);
  }

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
    console.log('\n=== Building Server ===');
    try {
      execSync('npm run build', { cwd: serverDir, stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' } });
      console.log('Server built successfully.');
    } catch (e) {
      console.warn('server build failed — continuing anyway...');
    }

    console.log('\n=== Building Client ===');
    try {
      execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });
      console.log('Client built successfully.');
    } catch (e) {
      console.warn('client build failed — continuing anyway...');
    }
  } else {
    console.log('\n=== Skipping build (dev mode) ===');
  }

  console.log('\n=== Starting Microservices ===');

  if (isDev) {
    run('app-server', 'npm', ['run', 'start:dev'], { cwd: serverDir });
  } else {
    run('app-server', 'npm', ['run', 'start'], { cwd: serverDir });
  }

  console.log('\n=== Starting Frontend Apps ===');
  if (isDev) {
    run('console', 'npm', ['run', 'dev:console'], { cwd: clientDir });
    run('admin', 'npm', ['run', 'dev:admin'], { cwd: clientDir });
  } else {
    run('console', 'npx', ['next', 'start', '-p', '3001'], { cwd: path.join(clientDir, 'console') });
    run('admin', 'npx', ['next', 'start', '-p', '3002'], { cwd: path.join(clientDir, 'admin') });
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
