import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const require = createRequire(import.meta.url)
const { createRenderer, h, KeepAlive, ref, nextTick } = require('vue')
const { createRouter, createMemoryHistory, RouterView, isNavigationFailure, NavigationFailureType } = require('vue-router')
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../hooks/decoration/useLeaveGuard.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue', 'vue-router'] })
const loaded = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(require, loaded, loaded.exports)
const { useLeaveGuard } = loaded.exports

// 使用真实 Vue 生命周期和内存路由；仅渲染宿主替换为不依赖浏览器的节点树。
const renderer = createRenderer({
  createElement: type => ({ type, children: [] }),
  createText: text => ({ text }), createComment: text => ({ text }),
  setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text }, patchProp() {},
  insert(node, parent, anchor) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1)
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node)
    node.parent = parent
  },
  remove(node) { if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1); node.parent = undefined },
  parentNode: node => node.parent,
  nextSibling: node => node.parent?.children[node.parent.children.indexOf(node) + 1],
})

async function workspace(run) {
  const previousWindow = globalThis.window
  globalThis.window = new EventTarget()
  const dirty = ref(false), saving = ref(false), uncertain = ref(false)
  let confirmResult = false, confirmations = 0, blockedMessages = 0, discards = 0
  const FormPage = { setup() {
    useLeaveGuard({ dirty: () => dirty.value, blocked: () => saving.value || uncertain.value,
      confirmDiscard: () => { confirmations++; return confirmResult },
      onBlocked: () => { blockedMessages++ }, onDiscard: () => { discards++; dirty.value = false },
    })
    return () => h('div', 'editable form')
  } }
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/form', component: FormPage }, { path: '/other', component: { render: () => h('div', 'other page') } },
  ] })
  const app = renderer.createApp({ render: () => h(RouterView, null, { default: ({ Component }) => h(KeepAlive, null, Component ? [Component] : []) }) })
  app.use(router)
  await router.push('/form'); await router.isReady(); app.mount({ children: [] }); await nextTick()
  const unload = () => { const event = new Event('beforeunload', { cancelable: true }); Object.defineProperty(event, 'returnValue', { value: '', writable: true }); globalThis.window.dispatchEvent(event); return event.defaultPrevented }
  try {
    await run({ router, dirty, saving, uncertain, unload, app, accept: () => { confirmResult = true },
      counts: () => ({ confirmations, blockedMessages, discards }) })
  } finally { app.unmount(); globalThis.window = previousWindow }
}

test('无草稿允许路由切换和刷新，不产生丢弃提示', () => workspace(async ({ router, unload, counts }) => {
  assert.equal(unload(), false)
  await router.push('/other')
  assert.equal(router.currentRoute.value.path, '/other')
  assert.deepEqual(counts(), { confirmations: 0, blockedMessages: 0, discards: 0 })
}))

test('未保存时取消切页和项目参数更新保留草稿，确认离开才丢弃', () => workspace(async ({ router, dirty, accept, counts }) => {
  dirty.value = true
  for (const path of ['/other', '/form?project=another']) {
    assert.equal(isNavigationFailure(await router.push(path), NavigationFailureType.aborted), true)
    assert.equal(router.currentRoute.value.fullPath, '/form')
    assert.equal(dirty.value, true)
  }
  accept(); await router.push('/other')
  assert.equal(router.currentRoute.value.path, '/other'); assert.equal(dirty.value, false)
  assert.deepEqual(counts(), { confirmations: 3, blockedMessages: 0, discards: 1 })
}))

test('提交中或结果未知均拒绝切页，不能通过确认丢弃绕过', () => workspace(async ({ router, dirty, saving, uncertain, accept, unload, counts }) => {
  dirty.value = true; accept(); saving.value = true
  assert.equal(unload(), true)
  assert.equal(isNavigationFailure(await router.push('/other'), NavigationFailureType.aborted), true)
  saving.value = false; uncertain.value = true
  assert.equal(unload(), true)
  assert.equal(isNavigationFailure(await router.push('/form?project=another'), NavigationFailureType.aborted), true)
  assert.equal(dirty.value, true); assert.equal(router.currentRoute.value.fullPath, '/form')
  assert.deepEqual(counts(), { confirmations: 0, blockedMessages: 2, discards: 0 })
}))

test('浏览器离开提示只作用于当前活动页面，缓存停用和卸载后移除', () => workspace(async ({ router, dirty, unload, app }) => {
  dirty.value = true; assert.equal(unload(), true)
  dirty.value = false; await router.push('/other'); await nextTick()
  dirty.value = true; assert.equal(unload(), false)
  await router.push('/form'); await nextTick(); assert.equal(unload(), true)
  app.unmount(); assert.equal(unload(), false)
}))
