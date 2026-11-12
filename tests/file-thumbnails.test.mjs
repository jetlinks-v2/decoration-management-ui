import { test } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
import { createRenderer, defineComponent, h, reactive, nextTick } from 'vue'

const compiled = await build({ entryPoints: [fileURLToPath(new URL('../hooks/decoration/useFiles.ts', import.meta.url))], bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'] })
const module = { exports: {} }
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
const { useFiles } = module.exports
const renderer = createRenderer({ createElement: () => ({}), createText: () => ({}), createComment: () => ({}), insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {}, parentNode: () => null, nextSibling: () => null })
const flush = async () => { await nextTick(); await new Promise(resolve => setImmediate(resolve)); await nextTick() }
function mount(props) {
  let state
  const app = renderer.createApp(defineComponent({ setup() { state = useFiles(props, ids => { props.value = ids }); return () => h('div') } }))
  app.mount({})
  return { state, stop: () => app.unmount() }
}

test('私有模板按通用二进制返回时仍下载可直接打开的Word文件', async () => {
  const original = globalThis.document, clicks = []
  globalThis.document = { createElement: () => { const anchor = { click() { clicks.push(this.download) } }; return anchor } }
  const bytes = await readFile(new URL('../assets/material-templates/TY-SNBD-GC-012_装修申请表.docx', import.meta.url))
  const view = mount(reactive({ projectId: 'p', value: [], api: { download: async () => new Blob([bytes], { type: 'application/octet-stream' }) } }))
  try {
    await view.state.download('template', '申请表确认')
    assert.deepEqual(clicks, ['申请表确认.docx'])
    assert.equal(view.state.error.value, '')
  } finally { view.stop(); globalThis.document = original }
})

test('业务图片自动获取缩略图，非图片保留附件入口；增加附件不会重下已有图片', async () => {
  const calls = []
  const props = reactive({ projectId: 'p', value: ['photo', 'pdf'], api: { download: async id => { calls.push(id); return new Blob(['data'], { type: id === 'pdf' ? 'application/pdf' : 'image/png' }) } } })
  const view = mount(props)
  try {
    await flush()
    const url = view.state.thumbnails.value.photo
    assert.match(url, /^blob:/)
    assert.equal(view.state.thumbnails.value.pdf, undefined)
    props.value = ['photo', 'pdf', 'next']; await flush()
    assert.deepEqual(calls, ['photo', 'pdf', 'next'])
    assert.equal(view.state.thumbnails.value.photo, url)
    assert.match(view.state.thumbnails.value.next, /^blob:/)
  } finally { view.stop() }
})

test('移除图片和切换项目会回收URL，旧项目的晚到响应不能写回', async () => {
  let finish
  const revoked = [], original = URL.revokeObjectURL
  URL.revokeObjectURL = url => { revoked.push(url); original(url) }
  const props = reactive({ projectId: 'old', value: ['photo'], api: { download: async () => new Blob(['image'], { type: 'image/png' }) } })
  const view = mount(props)
  try {
    await flush(); const first = view.state.thumbnails.value.photo
    props.value = []; await flush(); assert.ok(revoked.includes(first))
    props.api = { download: () => new Promise(resolve => { finish = resolve }) }
    props.value = ['late']; await flush()
    props.projectId = 'new'; props.value = []; await flush()
    finish(new Blob(['late'], { type: 'image/png' })); await flush()
    assert.deepEqual(view.state.thumbnails.value, {})
    props.api = { download: async () => new Blob(['new'], { type: 'image/png' }) }; props.value = ['new']; await flush()
    const last = view.state.thumbnails.value.new
    view.stop(); assert.ok(revoked.includes(last))
  } finally { URL.revokeObjectURL = original }
})

 test('旧Excel保留真实文件名，查看仅开启页面内预览且不跳转下载',async()=>{
  const original=globalThis.document,clicks=[]
  globalThis.document={createElement:()=>({click(){clicks.push(this.download)}})}
  const view=mount(reactive({projectId:'p',value:[],api:{attachmentInfo:async()=>({name:'装修清单.xls'}),download:async()=>new Blob([new Uint8Array([0xd0,0xcf,0x11,0xe0])],{type:'application/octet-stream'})}}))
  try{view.state.preview('excel');assert.equal(view.state.previewId.value,'excel');await view.state.download('excel');assert.deepEqual(clicks,['装修清单.xls'])}
  finally{view.stop();globalThis.document=original}
 })
