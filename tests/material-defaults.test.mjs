import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {build} from 'esbuild'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ref,nextTick} from 'vue'

const require=createRequire(import.meta.url)
const compiled=await build({stdin:{contents:'export * from "./utils/defaultMaterialItems"; export * from "./services/materialTemplates"; export * from "./hooks/decoration/useMaterialItems"',resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,format:'cjs',platform:'node',external:['vue'],plugins:[{name:'word-template-urls',setup(builder){
 builder.onResolve({filter:/\.(docx?|pdf)\?url$/},args=>({path:args.path,namespace:'template-url'}))
 builder.onLoad({filter:/.*/,namespace:'template-url'},args=>({contents:`export default ${JSON.stringify('/templates/'+args.path.split('/').at(-1).replace('?url',''))};`}))
}}]})
const module={exports:{}}
new Function('require','module','exports',compiled.outputFiles[0].text)(require,module,module.exports)
const {withFixedMaterialItems,useMaterialItems,prepareMaterialTemplates,materialTemplate}=module.exports

test('原系统四份资料、五项图纸完整补齐，效果图非必填，已有ID、模板与自定义项目保留',async()=>{
 const custom={id:'custom',name:'自定义资质',kind:'material',source:'upload',required:false,enabled:true,sort:20}
 const old={id:'old-id',name:'消防责任书',kind:'material',source:'sign',required:false,enabled:false,templateFileId:'old-receipt',sort:10}
 const items=ref([old,custom]),state=useMaterialItems(()=>items.value,()=>false,true)
 assert.deepEqual(state.sections.value[0].rows.map(item=>item.name),['消防责任书','装修须知','服务协议','申请表确认','自定义资质'])
 assert.deepEqual(state.sections.value[1].rows.map(item=>item.name),['拆改图','原始平面图','水电气图','效果图','业主身份证正反面'])
 assert.equal(items.value[0].id,'old-id');assert.equal(items.value[0].templateFileId,'old-receipt')
 assert.equal(items.value[0].source,'sign');assert.equal(items.value[0].enabled,false);assert.equal(items.value[0].required,false)
 assert.equal(items.value.find(item=>item.name==='效果图').required,false)
 state.remove('old-id');assert.equal(items.value.length,10)
 state.remove('custom');assert.equal(items.value.length,9)
 assert.deepEqual(withFixedMaterialItems(items.value),JSON.parse(JSON.stringify(items.value)))
 items.value=[];await nextTick();assert.equal(items.value.length,9)
})

test('原版Word文件走当前项目私有模板上传，已有回执不重复上传',async()=>{
 const previous=globalThis.fetch,calls=[],reads=[],items=withFixedMaterialItems([])
 items[0].templateFileId='existing-template'
 globalThis.fetch=async url=>{reads.push(url);const name=url.split('/').at(-1);return new Response(readFileSync(new URL('../assets/material-templates/'+name,import.meta.url)))}
 try{
  const api={upload:async(file,project,decoration,purpose)=>{
   calls.push({file,project,decoration,purpose})
   assert.deepEqual(Buffer.from(await file.arrayBuffer()),readFileSync(new URL('../assets/material-templates/'+file.name,import.meta.url)))
   return {id:'receipt-'+calls.length}
  }}
  await prepareMaterialTemplates(api,'project-a',items)
  assert.equal(reads.length,3);assert.equal(calls.length,3)
  assert.ok(calls.every(call=>call.project==='project-a'&&call.decoration===undefined&&call.purpose==='template'))
  assert.ok(items.filter(item=>item.kind==='material').every(item=>item.templateFileId))
  await prepareMaterialTemplates(api,'project-a',items);assert.equal(calls.length,3)
  assert.equal(materialTemplate(items.find(item=>item.kind==='drawing')),undefined)
 }finally{globalThis.fetch=previous}
})

test('模板上传失败保留已成功回执，重试只补剩余文件，不把HTML响应当Word模板',async()=>{
 const previous=globalThis.fetch,items=withFixedMaterialItems([]),calls=[]
 globalThis.fetch=async url=>new Response(readFileSync(new URL('../assets/material-templates/'+url.split('/').at(-1),import.meta.url)))
 try{
  let fail=true
  const api={upload:async file=>{calls.push(file.name);if(fail&&calls.length===2)throw new Error('模板上传失败');return {id:file.name}}}
  await assert.rejects(prepareMaterialTemplates(api,'project-a',items),/模板上传失败/)
  assert.ok(items[0].templateFileId);assert.equal(items[1].templateFileId,undefined)
  fail=false;await prepareMaterialTemplates(api,'project-a',items)
  assert.equal(calls.filter(name=>name===materialTemplate(items[0]).name).length,1)
  globalThis.fetch=async()=>new Response('<html>登录页面</html>')
  await assert.rejects(prepareMaterialTemplates(api,'project-a',withFixedMaterialItems([])),/资料模板文件无效/)
 }finally{globalThis.fetch=previous}
})
