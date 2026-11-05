import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const host = process.env.RUNTIME_UI_ROOT || [resolve(root, '../../..', 'sass平台/cloud.jetlinks/runtime-ui'), resolve(root, '../..')]
  .find(path => existsSync(resolve(path, 'jetlinks-web-core/src/utils/modules.ts')))
assert(host, 'Set RUNTIME_UI_ROOT to the SaaS runtime-ui checkout')
const sharedRoot = resolve(host, 'modules/property-base-ui')
async function load(path, globs = {}) {
  globalThis.__baseGlobs = globs
  const result = await build({ entryPoints: [path], bundle: true, write: false, platform: 'node', format: 'cjs', plugins: [{
    name: 'runtime', setup(builder) {
      builder.onResolve({ filter: /^@jetlinks-web\/utils$/ }, () => ({path: resolve(host, 'node_modules/@jetlinks-web/utils/src/config.ts')}))
      builder.onResolve({ filter: /^@jetlinks-web-core\/utils\/module-registry$|^@jetlinks-web\/core$|\.vue$/ }, ({path}) => ({path, namespace: 'browser'}))
      builder.onLoad({ filter: /.*/, namespace: 'browser' }, ({path}) => ({contents: path.endsWith('.vue') ? 'export default {}' : path.includes('module-registry') ? 'export const moduleRegistry = globalThis.__baseRegistry' : 'export const request = globalThis.__baseRequest'}))
      builder.onLoad({ filter: /(?:index|modules)\.ts$/ }, ({path}) => ({contents: readFileSync(path, 'utf8').replaceAll('import.meta.glob', 'globalThis.__baseGlob'), loader: 'ts', resolveDir: dirname(path)}))
    }
  }]})
  const module = {exports: {}}
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, module, module.exports)
  return module.exports
}
const views = dir => Object.fromEntries(readdirSync(resolve(dir, 'views'), {recursive: true})
  .map(path => path.replaceAll('\\', '/')).filter(path => path.endsWith('/index.vue'))
  .map(path => [`./views/${path}`, async () => resolve(dir, 'views', path)]))
test('公共模块唯一提供基础菜单和路由，业务不再注册基础副本，公共API沿用宿主请求', async () => {
  const resources = new Map(), requests = []
  globalThis.__baseRegistry = { register: (name, value) => resources.set(name, value), getResourceItem: (name, type, key) => resources.get(name)?.[type]?.[key] }
  globalThis.__baseRequest = {get: async (...args) => {requests.push(args); return {success: true, result: []}}}
  globalThis.__baseGlob = pattern => globalThis.__baseGlobs[pattern] || {}
  const shared = await load(resolve(sharedRoot, 'index.ts'), {'./views/**/index.vue': views(sharedRoot)})
  const business = await load(resolve(root, 'index.ts'), {'./views/**/index.vue': views(root)})
  const sharedMenu = await load(resolve(sharedRoot, 'baseMenu.ts'))
  const businessMenu = await load(resolve(root, 'baseMenu.ts'))
  const modules = await load(resolve(host, 'jetlinks-web-core/src/utils/modules.ts'), {
    '../../../modules/*/index.ts': {'../../../modules/property-base-ui/index.ts': shared, '../../../modules/business/index.ts': business},
    '../../../modules/*/baseMenu.ts': {'../../../modules/property-base-ui/baseMenu.ts': sharedMenu, '../../../modules/business/baseMenu.ts': businessMenu}
  })
  const menus = modules.getModulesMenu()
  const flatten = nodes => nodes.flatMap(node => [node, ...flatten(node.children || [])])
  const basics = menus.filter(menu => menu.id === 'charging-basic')
  assert.equal(basics.length, 1)
  assert.equal(basics[0].children.length, 5)
  assert.equal(basics[0].options?.appName, undefined)
  const routes = shared.default.getAsyncRoutesMap(), businessRoutes = business.default.getAsyncRoutesMap()
  for (const menu of basics[0].children) {
    assert.equal(typeof routes[menu.code], 'function')
    assert.equal(businessRoutes[menu.code], undefined)
    assert.ok(readFileSync(await routes[menu.code](), 'utf8').includes('<template>'))
  }
  assert(!flatten(menus).some(menu => ['decoration-basic', 'patrol-system'].includes(menu.id)))
  modules.registerModule()
  const name = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).name
  assert.deepEqual(resources.get(name), {apis: {}, components: {}})
  await resources.get('property-base-ui').apis.getOrganizationTree()
  assert.equal(requests.at(-1)[0], '/property/organization/_tree')
  if (name === 'decoration-management-ui') {
    const {propertyBaseApis} = await load(resolve(root, 'services/propertyBase.ts'))
    await propertyBaseApis().getDictionaryTypes()
    assert.equal(requests.at(-1)[0], '/property/dictionary/_types')
    resources.delete('property-base-ui')
    assert.throws(propertyBaseApis, /物业基础管理模块未加载/)
  }
  const scripts = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts
  assert(scripts.dev.includes(`${name},property-base-ui,authentication-manager-ui`))
  assert(scripts['build:with-base'].includes(`${name},property-base-ui`))
})
