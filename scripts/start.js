const { spawn, execSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const dbDir = path.join(root, 'farm server', 'packages', 'server', 'database');
const appServerDir = path.join(root, 'farm server', 'app-server');

const isDev = process.argv.includes('--dev');

function run(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { cwd: opts.cwd || root, stdio: 'inherit', shell: true, env: process.env, ...opts });
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

  const services = [
    { name: 'auth',         proj: 'auth-service',         port: 4010 },
    { name: 'farm',         proj: 'farm-service',         port: 4011 },
    { name: 'livestock',    proj: 'livestock-service',    port: 4012 },
    { name: 'poultry',      proj: 'poultry-service',      port: 4013 },
    { name: 'finance',      proj: 'finance-service',      port: 4014 },
    { name: 'hr',           proj: 'hr-service',           port: 4015 },
    { name: 'notification', proj: 'notification-service', port: 4016 },
    { name: 'organization', proj: 'organization-service', port: 4017 },
    { name: 'platform',     proj: 'platform-service',     port: 4018 },
    { name: 'reporting',    proj: 'reporting-service',    port: 4019 },
    { name: 'crop',         proj: 'crop-service',         port: 4020 },
    { name: 'realtime',     proj: 'realtime-service',     port: 4021 },
    { name: 'api',          proj: 'api-service',          port: 4022 },
  ];

  for (const svc of services) {
    process.env[`${svc.name.toUpperCase()}_SERVICE_PORT`] = String(svc.port);

    if (isDev) {
      run(svc.name, 'npx', ['nest', 'start', '--watch', svc.proj], { cwd: appServerDir });
    } else {
      run(svc.name, 'node', [`dist/microservices/${svc.name}.main.js`], { cwd: appServerDir });
    }
  }

  console.log('\n=== Starting Frontend Apps ===');
  if (isDev) {
    run('console', 'npx', ['next', 'dev', '-p', '3001'], { cwd: path.join(root, 'farm client', 'console') });
    run('admin', 'npx', ['next', 'dev', '-p', '3002'], { cwd: path.join(root, 'farm client', 'admin') });
  } else {
    run('console', 'npx', ['next', 'start', '-p', '3001'], { cwd: path.join(root, 'farm client', 'console') });
    run('admin', 'npx', ['next', 'start', '-p', '3002'], { cwd: path.join(root, 'farm client', 'admin') });
  }

  console.log('\nAll services started.');
  console.log(`\nMode: ${mode}`);
  console.log('\nMicroservices (HTTP):');
  console.log('  - Auth:         http://localhost:4010');
  console.log('  - Farm:         http://localhost:4011');
  console.log('  - Livestock:    http://localhost:4012');
  console.log('  - Poultry:      http://localhost:4013');
  console.log('  - Finance:      http://localhost:4014');
  console.log('  - HR:           http://localhost:4015');
  console.log('  - Notification: http://localhost:4016');
  console.log('  - Organization: http://localhost:4017');
  console.log('  - Platform:     http://localhost:4018');
  console.log('  - Reporting:    http://localhost:4019');
  console.log('  - Crop:         http://localhost:4020');
  console.log('  - Realtime:     http://localhost:4021');
  console.log('  - API Router:   http://localhost:4022');
  console.log('\nFrontend:');
  console.log('  - Console:      http://localhost:3001');
  console.log('  - Admin:        http://localhost:3002');
  console.log(`\nAPI Gateway (public entry): http://localhost:4022`);
}
main();
