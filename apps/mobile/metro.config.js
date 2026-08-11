const path = require('node:path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Metro does not follow symlinks out of the project by default, so a monorepo
// needs three things spelled out: watch the whole workspace, look for modules
// in both node_modules trees, and refuse to walk up past the workspace root.
config.watchFolders = [workspaceRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

// The workspace packages ship TypeScript source rather than a build artifact,
// so point Metro at their entry files directly.
config.resolver.extraNodeModules = {
  '@amir/shipping-core': path.resolve(workspaceRoot, 'packages/shipping-core'),
  '@amir/shipping-client': path.resolve(workspaceRoot, 'packages/shipping-client'),
}

module.exports = config
