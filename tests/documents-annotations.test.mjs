import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {effectScope,nextTick,ref} from 'vue'
const require=createRequire(import.meta.url)
async function load(entry){const result=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue']});const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports}
const docs=await load('../utils/signedDocuments.ts'),image=await load('../utils/imageAnnotations.ts')
const {useSignedDocuments}=await load('../hooks/decoration/useSignedDocuments.ts'),{useChargeItems}=await load('../hooks/decoration/useChargeItems.ts')
const config={household:{spaceName:'101',customerName:'测试业主'},agreement:{title:'装修协议',content:'须知正文',supplements:[{name:'消防要求',content:'严禁堵塞消防通道'}],deposit:1000}}
const form={projectId:'p',contactPhone:'13800000000',constructionUnit:'测试',constructionManager:'负责人',managerPhone:'13900000000',selfInspectionStatus:1,selfInspectionRemark:'墙面问题',constructionType:1,decorationType:'first',startTime:1794096000000,completionTime:1794182400000,ownerCertificate:'11010519491231002X',managerCertificate:'11010519491231002X'}
test('四类文书冻结不同正文、公开关系和协议补充条款，显示而不解析HTML',()=>{
 const values=Object.keys(docs.documentTitles).map(kind=>docs.documentContent(kind,form,config))
 assert.equal(new Set(values).size,4);assert.match(values[0],/自检结果：有问题\n自检说明：墙面问题/)
 assert.match(values[1],/消防要求\n严禁堵塞消防通道/);assert.match(values[2],/协议保证金：1000.00 元/);assert.match(values[3],/消防安全责任/)
 assert.match(docs.documentContent('notices',form,{...config,agreement:{...config.agreement,content:'<script>不可执行</script>'}}),/<script>不可执行<\/script>/)
})
test('签署施工日期使用上海自然日，零点和午夜不随浏览器时区偏移',()=>{
 const content=docs.documentContent('application',{...form,startTime:Date.parse('2026-11-08T00:00:00+08:00'),completionTime:Date.parse('2026-12-08T23:59:59+08:00')},config)
 assert.match(content,/开工日期：2026-11-08\n计划竣工日期：2026-12-08/)
 assert.doesNotMatch(content,/开工日期：2026-11-07/)
})
test('修改房屋、申请或协议后签署快照失效，重新挂载不会删除有效快照',async()=>{
 const {reactive}=await import('vue');const draft=reactive({...form,signedDocuments:[]});draft.signedDocuments=Object.keys(docs.documentTitles).map(kind=>({kind,content:docs.documentContent(kind,draft,config),signatureFileId:'s',documentFileId:kind}))
 const scope=effectScope();scope.run(()=>useSignedDocuments({},draft,()=>config));assert.equal(draft.signedDocuments.length,4)
 draft.contactPhone='13900000000';await nextTick();assert.equal(draft.signedDocuments.length,0);scope.stop()
})
test('反向拖动、越界拖动和细微误触的框选坐标规范化，删除和编辑不影响原图',()=>{
 assert.deepEqual(image.rectangle({x:.8,y:.7},{x:.2,y:.1}),{x:.2,y:.1,width:.6000000000000001,height:.6,text:''})
 assert.deepEqual(image.rectangle({x:-.1,y:-.1},{x:1.2,y:1.1}),{x:0,y:0,width:1,height:1,text:''})
 assert.equal(image.rectangle({x:.1,y:.1},{x:.101,y:.2}),undefined)
 const calls=[],ctx={strokeRect:(...a)=>calls.push(['rect',...a]),measureText:()=>({width:50}),fillRect:()=>{},fillText:(...a)=>calls.push(['text',...a])}
 image.drawMarks(ctx,[{x:.1,y:.2,width:.4,height:.3,text:'重新上传'}],1000,500)
 assert.deepEqual(calls[0],['rect',100,100,400,150]);assert.equal(calls[1][1],'1. 重新上传')
})
test('收费目录不可用有明确错误，不作为空列表；切换项目丢弃旧返回',async()=>{
 const project=ref('p');let resolve;const pending=new Promise(r=>resolve=r)
 const scope=effectScope(),vm=scope.run(()=>useChargeItems({chargeItems:async id=>id==='p'?pending:Promise.reject(new Error('收费目录暂未接通'))},()=>project.value))
 project.value='q';await nextTick();await new Promise(r=>setImmediate(r));assert.match(vm.error.value,/暂未接通/)
 resolve({data:[{id:'stale',name:'旧项目'}]});await nextTick();await new Promise(r=>setImmediate(r));assert.deepEqual(vm.items.value,[]);scope.stop()
})
