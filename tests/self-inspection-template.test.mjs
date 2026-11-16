import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'

const built=await build({entryPoints:[fileURLToPath(new URL('../services/selfInspectionTemplate.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['jspdf']})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const definition=(index,enabled=true)=>({id:`window-${index}`,group:'windows',groupTitle:'门窗检查',optionTitle:'旧结果标题',name:`窗户检查${index}`,enabled,sort:index+1})

test('最新配置的分类和启用项生成空白模板，较多自检项分页且不丢项',()=>{
 const definitions=Array.from({length:21},(_,index)=>definition(index));definitions.push(definition(99,false))
 const pages=module.exports.selfInspectionTemplatePages(definitions)
 assert.equal(pages.length,3)
 const items=pages.flatMap(page=>page.groups.flatMap(group=>group.items))
 assert.deepEqual(items.map(item=>item.key),definitions.filter(item=>item.enabled).map(item=>item.id))
 assert.ok(items.every(item=>item.value===undefined))
 assert.ok(pages.every(page=>page.groups.every(group=>group.title==='门窗检查'&&group.optionTitle==='是否正常')))
 assert.throws(()=>module.exports.selfInspectionTemplatePages([definition(0,false)]),/没有启用的自检项/)
})

test('保存生成有效PDF，使用配置中的分类和自检项，保留空白签名及日期',async()=>{
 const original=globalThis.document,text=[]
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')
 const ctx={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText:value=>text.push(value),drawImage(){throw new Error('空白模板不应包含签名')}}
 globalThis.document={createElement:()=>({getContext:()=>ctx,toBlob:callback=>callback(new Blob([png],{type:'image/png'}))})}
 try{
  const blob=await module.exports.selfInspectionTemplate([definition(0)])
  assert.equal(blob.type,'application/pdf');assert.ok((await blob.text()).startsWith('%PDF-'))
  for(const value of ['门窗检查','窗户检查0','是否正常','□ 是       □ 否','业主签字：','日期：       年       月       日'])assert.ok(text.includes(value),value)
  assert.ok(!text.includes('旧结果标题'));assert.ok(!text.some(value=>value.includes('☑')))
 }finally{globalThis.document=original}
})


test('模板上传使用当前项目和模板用途，成功后替换引用，失败保留旧引用',async()=>{
 const original=globalThis.document
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')
 const ctx={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}}
 globalThis.document={createElement:()=>({getContext:()=>ctx,toBlob:callback=>callback(new Blob([png],{type:'image/png'}))})}
 const row={projectId:'current-project',content:{selfInspections:[definition(0)],selfInspectionTemplateFileId:'old'}}
 try{
  await module.exports.prepareSelfInspectionTemplate({upload:async(file,project,application,purpose)=>{
   assert.equal(project,'current-project');assert.equal(application,undefined);assert.equal(purpose,'template');assert.equal(file.name,'装修自检表.pdf');assert.ok((await file.text()).startsWith('%PDF-'));return {id:'latest'}
  }},row)
  assert.equal(row.content.selfInspectionTemplateFileId,'latest')
  await assert.rejects(module.exports.prepareSelfInspectionTemplate({upload:async()=>{throw new Error('上传失败')}},row),/上传失败/)
  assert.equal(row.content.selfInspectionTemplateFileId,'latest')
 }finally{globalThis.document=original}
})
