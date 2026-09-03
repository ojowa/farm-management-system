const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Resolve @/ alias to ./src/ (must match tsconfig.json paths)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    const subPath = moduleName.slice(2);
    return {
      filePath: path.join(projectRoot, 'src', subPath),
      type: 'sourceFile',
    };
  }
  return originalResolveRequest(context, moduleName, platform);
};

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;
