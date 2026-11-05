import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRenderer, h, reactive, nextTick } from 'vue'
import { parse, compileScript } from 'vue/compiler-sfc'
const require = createRequire(import.meta.url)
const filename = fileURLToPath(new URL('../components/decoration/ProjectTreeSelect.vue', import.meta.url))
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const compiled = compileScript(descriptor, { id: 'project-filter', inlineTemplate: true })
const result = await build({
  stdin: { contents: compiled.content, loader: 'ts', resolveDir: fileURLToPath(new URL('../components/decoration', import.meta.url)) },
  bundle: true, write: false, platform: 'node', format: 'cjs', external: ['vue'],
  plugins: [{ name: 'tree-control', setup(builder) {
    builder.onResolve({ filter: /^ant-design-vue$/ }, args => ({ path: args.path, namespace: 'control' }))
    builder.onLoad({ filter: /.*/, namespace: 'control' }, () => ({ contents: `
      import {defineComponent,h} from 'vue'
      export const TreeSelect=defineComponent({inheritAttrs:false,setup(_,context){globalThis.__projectControl=context;return ()=>h('tree-select')}})
    ` }))
  } }]
})
const loaded = { exports: {} }
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, loaded, loaded.exports)
const Selector = loaded.exports.default
function mount() {
  const props = reactive({ value: undefined, disabled: false, allowClear: true, placeholder: '全部有权项目', treeData: [
    { value: 'group', title: '集团', disabled: true, selectable: false, children: [
      { value: 'p', title: '项目', disabled: false, selectable: true, children: [
        { value: 'department', title: '部门', disabled: true, selectable: false, children: [] }
      ] }
    ] },
    { value: 'outside', title: '外部单位', disabled: true, selectable: false, children: [] }
  ] })
  const changes=[]
  const renderer=createRenderer({createElement:()=>({}),createText:()=>({}),createComment:()=>({}),insert(){},remove(){},setText(){},setElementText(){},patchProp(){},parentNode:()=>null,nextSibling:()=>null})
  const app=renderer.createApp({render:()=>h(Selector,{...props,'onUpdate:value':value=>changes.push(value)})})
  app.mount({})
  return {props,changes,control:()=>globalThis.__projectControl,stop:()=>app.unmount()}
}
test('组织树项目筛选保留祖先和项目子级，非项目及树外值不能触发筛选，项目可搜索并可清空', async t=>{
  const view=mount();t.after(view.stop)
  const attrs=view.control().attrs
  assert.equal(attrs['tree-data'][0].title,'集团')
  assert.equal(attrs['tree-data'][0].children[0].children[0].value,'department')
  assert.equal(attrs['show-search'],'');assert.equal(attrs['tree-node-filter-prop'],'title')
  assert.equal(attrs['tree-default-expand-all'],'')
  for(const value of ['group','department','outside','unknown',123,{}])view.control().emit('update:value',value)
  assert.deepEqual(view.changes,[])
  view.control().emit('update:value','p');assert.deepEqual(view.changes,['p'])
  view.control().emit('update:value',undefined);assert.deepEqual(view.changes,['p',undefined])
  view.props.disabled=true;await nextTick();view.control().emit('update:value','p');assert.equal(view.changes.length,2)
})
test('必选项目入口禁止清空，刷新后的树不接受已失去权限的旧项目', async t=>{
  const view=mount();t.after(view.stop)
  view.props.allowClear=false;await nextTick();view.control().emit('update:value','');assert.deepEqual(view.changes,[])
  view.control().emit('update:value','p');assert.deepEqual(view.changes,['p'])
  view.props.treeData=[];await nextTick();view.control().emit('update:value','p');assert.deepEqual(view.changes,['p'])
})
