import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {effectScope} from 'vue'

const require=createRequire(import.meta.url)
const built=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useDiscardConfirm.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{name:'confirmation-view',setup(builder){
 builder.onResolve({filter:/^ant-design-vue$/},()=>({path:'confirmation-view',namespace:'test'}))
 builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const Modal={confirm:options=>globalThis.__discardDialog(options)}'}))
}}]})
const loaded={exports:{}}
new Function('require','module','exports',built.outputFiles[0].text)(require,loaded,loaded.exports)
const {useDiscardConfirm}=loaded.exports

test('页面确认可取消或放弃，不调用原生confirm，重复点击不排队',async()=>{
 let dialog,opens=0
 globalThis.__discardDialog=options=>{dialog=options;opens++;return {destroy(){options.afterClose()}}}
 const scope=effectScope(),confirm=scope.run(()=>useDiscardConfirm(()=> '未保存的表单'))
 try{
  const cancel=confirm()
  assert.equal(await confirm(),false)
  assert.equal(opens,1)
  assert.equal(dialog.title,'未保存的表单')
  dialog.onCancel()
  assert.equal(await cancel,false)
  const accept=confirm();dialog.onOk()
  assert.equal(await accept,true)
 }finally{scope.stop();delete globalThis.__discardDialog}
})

test('组件卸载销毁待确认弹窗并返回取消，晚到确认不能执行丢弃',async()=>{
 let dialog,destroys=0
 globalThis.__discardDialog=options=>{dialog=options;return {destroy(){destroys++;options.afterClose()}}}
 const scope=effectScope(),confirm=scope.run(()=>useDiscardConfirm(()=> '离开'))
 try{
  const pending=confirm();scope.stop()
  assert.equal(await pending,false)
  assert.equal(destroys,1)
  dialog.onOk()
  assert.equal(await confirm(),false)
 }finally{scope.stop();delete globalThis.__discardDialog}
})
