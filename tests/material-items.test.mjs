import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {reactive,ref} from 'vue'
const require=createRequire(import.meta.url)
const result=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useMaterialItems.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue']})
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports)
const {useMaterialItems}=module.exports

test('资料图纸分别新增，分组删除按ID操作，不修改既有签署、回执和必填设置',()=>{
 const items=reactive([{id:'drawing',kind:'drawing',name:'旧图纸',source:'upload',required:false,enabled:true,sort:8},{id:'material',kind:'material',name:'签署资料',source:'sign',required:true,enabled:false,templateFileId:'receipt',sort:4}])
 const state=useMaterialItems(()=>items,()=>false)
 assert.deepEqual(state.sections.value.map(section=>section.rows.map(item=>item.id)),[['material'],['drawing']])
 state.add('material');state.add('drawing');assert.equal(items[2].kind,'material');assert.equal(items[3].kind,'drawing');assert.equal(items[3].required,true)
 assert.ok(items[3].sort>items[2].sort&&items[2].sort>8);assert.notEqual(items[2].id,items[3].id)
 state.remove(state.sections.value[0].rows[1].id);assert.equal(items.length,3);assert.equal(items[0].required,false);assert.equal(items[1].templateFileId,'receipt');assert.equal(items[1].source,'sign');assert.equal(items[1].enabled,false)
 state.remove('does-not-exist');assert.equal(items.length,3)
})
test('上传或保存中不能新增删除，解除后恢复；更换草稿不保留上一份材料',()=>{
 const busy=ref(true),items=ref([]),state=useMaterialItems(()=>items.value,()=>busy.value)
 state.add('material');assert.equal(items.value.length,0);busy.value=false;state.add('drawing');const id=items.value[0].id
 busy.value=true;state.remove(id);assert.equal(items.value.length,1);busy.value=false;state.remove(id);assert.equal(items.value.length,0)
 state.add('material');items.value=[];assert.deepEqual(state.sections.value.map(section=>section.rows),[[],[]])
})
