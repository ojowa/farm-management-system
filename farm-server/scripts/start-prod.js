const { spawn } = require('child_process');
const path = require('path');

const targets = [
  {
    name: 'api',
    script: path.join(__dirname, '..', 'app-server', 'dist', 'microservices', 'api.main.js'),
    heap: process.env.API_HEAP_MB || '96',
  },
  {
    name: 'domains',
    script: path.join(__dirname, '..', 'app-server', 'dist', 'microservices', 'domains.main.js'),
    heap: process.env.DOMAINS_HEAP_MB || '320',
  },
];

const children = [];
let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      child.kill('SIGTERM');
    } catch (e) {}
  }
  setTimeout(() => process.exit(code), 2000);
}

for (const target of targets) {
  const child = spawn(process.execPath, [`--max-old-space-size=${target.heap}`, target.script], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('error', (err) => {
    console.error(`[start-prod] failed to start ${target.name}: ${err.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    console.error(`[start-prod] ${target.name} exited (code=${code} signal=${signal})`);
    shutdown(code && code !== 0 ? code : 1);
  });
  children.push(child);
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
