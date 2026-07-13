const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Exclude build artifacts from other apps to prevent watcher errors
config.resolver.blockList = [
  /\/apps\/admin\/.next\/.*/,
  /\/apps\/console\/.next\/.*/,
  /\/apps\/web\/.next\/.*/,
  /\/services\/.*\/dist\/.*/,
  /\/.turbo\/.*/,
  /\/.expo\/.*/,
];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
