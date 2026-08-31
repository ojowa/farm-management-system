const { spawn } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const dbDir = path.join(root, 'farm server', 'packages', 'server', 'database');
const appServerDir = path.join(root, 'farm server', 'app-server');
const apiGatewayDir = path.join(root, 'farm server', 'api-gateway');

function run(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, { cwd: opts.cwd || root, stdio: 'inherit', shell: true, ...opts });
  child.on('error', (err) => console.error(`[${label}] error:`, err.message));
  child.on('exit', (code) => console.log(`[${label}] exited with code ${code}`));
  return child;
}

async function main() {
  // 1. Set default env vars
  if (!process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004';
  if (!process.env.SERVICE_SECRET) process.env.SERVICE_SECRET = 'fms-service-secret-key-change-in-production';

  // 2. Run prisma migrate deploy
  console.log('\n=== Running Prisma migrations ===');
  try {
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { cwd: dbDir, stdio: 'inherit' });
    console.log('Migrations applied successfully.');
  } catch (e) {
    console.warn('prisma migrate deploy failed — continuing anyway...');
  }

  // 3. Build all packages and app-server (compiles all microservice entry points)
  console.log('\n=== Building Packages & App Server ===');
  try {
    const { execSync } = require('child_process');
    // Build shared packages first
    execSync('npm run build -w @farm/domain-core && npm run build -w @farm/types-server && npm run build -w @farm/env && npm run build -w @farm/utils && npm run build -w @farm/validation-server && npm run build -w @farm/auth-server && npm run build -w @farm/database', { cwd: root, stdio: 'inherit' });
    // Build app-server
    execSync('npm run build', { cwd: appServerDir, stdio: 'inherit' });
    console.log('App Server built successfully.');
  } catch (e) {
    console.warn('build failed — continuing anyway...');
  }

  // 4. Build API Gateway
  console.log('\n=== Building API Gateway ===');
  try {
    const { execSync } = require('child_process');
    execSync('npm run build', { cwd: apiGatewayDir, stdio: 'inherit' });
    console.log('API Gateway built successfully.');
  } catch (e) {
    console.warn('API Gateway build failed — continuing anyway...');
  }

  // 5. Start all microservices (HTTP mode)
  console.log('\n=== Starting Microservices (HTTP) ===');

  const services = [
    { name: 'auth-service',        script: 'dist/microservices/auth.main.js',        port: 4010 },
    { name: 'farm-service',        script: 'dist/microservices/farm.main.js',        port: 4011 },
    { name: 'livestock-service',   script: 'dist/microservices/livestock.main.js',   port: 4012 },
    { name: 'poultry-service',     script: 'dist/microservices/poultry.main.js',     port: 4013 },
    { name: 'finance-service',     script: 'dist/microservices/finance.main.js',     port: 4014 },
    { name: 'hr-service',          script: 'dist/microservices/hr.main.js',          port: 4015 },
    { name: 'notification-service', script: 'dist/microservices/notification.main.js', port: 4016 },
    { name: 'organization-service', script: 'dist/microservices/organization.main.js', port: 4017 },
    { name: 'platform-service',    script: 'dist/microservices/platform.main.js',    port: 4018 },
    { name: 'reporting-service',   script: 'dist/microservices/reporting.main.js',   port: 4019 },
    { name: 'crop-service',        script: 'dist/microservices/crop.main.js',        port: 4020 },
    { name: 'realtime-service',    script: 'dist/microservices/realtime.main.js',    port: 4021 },
  ];

  for (const svc of services) {
    run(svc.name, 'node', [svc.script], {
      cwd: appServerDir,
      env: {
        ...process.env,
        [`${svc.name.replace(/-/g, '_').toUpperCase()}_PORT`]: String(svc.port),
        [`${svc.name.replace(/-/g, '_').toUpperCase()}_URL`]: `http://localhost:${svc.port}`,
      },
    });
  }

  // 6. Start API Gateway (port 4000)
  console.log('\n=== Starting API Gateway (HTTP Reverse Proxy) ===');
  run('api-gateway', 'node', ['dist/main'], {
    cwd: apiGatewayDir,
    env: { ...process.env, API_GATEWAY_PORT: '4000' },
  });

  // 7. Start Frontend Applications
  console.log('\n=== Starting Frontend Applications ===');
  run('console', 'npx', ['next', 'start', '-p', '3001'], { cwd: path.join(root, 'farm client', 'console') });
  run('admin', 'npx', ['next', 'start', '-p', '3002'], { cwd: path.join(root, 'farm client', 'admin') });

  console.log('\nAll services started.');
  console.log('\nMicroservices running on (HTTP):');
  console.log('  - Auth Service:         http://localhost:4010');
  console.log('  - Farm Service:         http://localhost:4011');
  console.log('  - Livestock Service:    http://localhost:4012');
  console.log('  - Poultry Service:      http://localhost:4013');
  console.log('  - Finance Service:      http://localhost:4014');
  console.log('  - HR Service:           http://localhost:4015');
  console.log('  - Notification Service: http://localhost:4016');
  console.log('  - Organization Service: http://localhost:4017');
  console.log('  - Platform Service:     http://localhost:4018');
  console.log('  - Reporting Service:    http://localhost:4019');
  console.log('  - Crop Service:         http://localhost:4020');
  console.log('  - Realtime Service:     http://localhost:4021');
  console.log('\nAPI Gateway (HTTP Reverse Proxy): http://localhost:4000');
  console.log('\nFrontend Apps:');
  console.log('  - Console:              http://localhost:3001');
  console.log('  - Admin (merged):       http://localhost:3002');
}

main();
