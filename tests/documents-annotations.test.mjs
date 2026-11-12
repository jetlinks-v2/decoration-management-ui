import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {effectScope,nextTick,ref} from 'vue'
const require=createRequire(import.meta.url)
async function load(entry){const result=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue']});const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports}
const docs=await load('../utils/signedDocuments.ts'),image=await load('../utils/imageAnnotations.ts'),self=await load('../utils/selfInspection.ts'),renderer=await load('../utils/selfInspectionImage.ts')
const {useSignedDocuments}=await load('../hooks/decoration/useSignedDocuments.ts'),{useChargeItems}=await load('../hooks/decoration/useChargeItems.ts')
const config={household:{spaceName:'101',customerName:'测试业主'},materials:[{id:'test',name:'消防责任书',kind:'material',enabled:true,templateFileId:'template-1'}],agreement:{title:'装修协议',content:'须知正文',supplements:[{name:'消防要求',content:'严禁堵塞消防通道'}],deposit:1000}}
const form={materials:[],projectId:'p',contactPhone:'13800000000',constructionUnit:'测试',constructionManager:'负责人',managerPhone:'13900000000',selfInspectionStatus:1,selfInspectionRemark:'墙面问题',selfInspectionItems:self.emptySelfInspectionItems().map(item=>({...item,value:item.key!=='kitchenDrainage'})),constructionType:1,decorationType:'first',startTime:1794096000000,completionTime:1794182400000,ownerCertificate:'11010519491231002X',managerCertificate:'11010519491231002X'}
test('自检冻结九项答案，资料签署正文按配置项绑定模板和申请信息',()=>{
 const selfText=docs.documentContent('selfInspection',form,config),material=docs.documentContent('material:test',form,config)
 assert.match(selfText,/厨房排水：否/);assert.match(selfText,/生活阳台排水：是\n\n处理状态：有问题/);assert.doesNotMatch(selfText,/自检说明|施工单位/)
 assert.match(material,/消防责任书/);assert.match(material,/资料模板：template-1/);assert.match(material,/施工单位：测试/)
 assert.equal(docs.documentContent('material:test',form,{...config,materials:[{...config.materials[0],name:'<script>不可执行<\/script>'}]}).includes('<script>'),true)
})
test('签署施工日期使用上海自然日，零点和午夜不随浏览器时区偏移',()=>{
 const content=docs.documentContent('material:test',{...form,startTime:Date.parse('2026-11-08T00:00:00+08:00'),completionTime:Date.parse('2026-12-08T23:59:59+08:00')},config)
 assert.match(content,/开工日期：2026-11-08\n计划竣工日期：2026-12-08/)
 assert.doesNotMatch(content,/开工日期：2026-11-07/)
})
test('修改房屋、申请或协议后签署快照失效，重新挂载不会删除有效快照',async()=>{
 const {reactive}=await import('vue');const draft=reactive({...form,signedDocuments:[]});draft.signedDocuments=['selfInspection','material:test'].map(kind=>({kind,content:docs.documentContent(kind,draft,config),signatureFileId:'s',documentFileId:kind}))
 const scope=effectScope();scope.run(()=>useSignedDocuments({},draft,()=>config));assert.equal(draft.signedDocuments.length,2)
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

test('九项自检生成完整表格和签名图片，图片与正文保留逐项结果',async()=>{
 const original=globalThis.document,calls=[],signature={naturalWidth:640,naturalHeight:240}
 const ctx={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText:(text)=>calls.push(['text',text]),drawImage:(...args)=>calls.push(['signature',...args])}
 globalThis.document={createElement:()=>({getContext:()=>ctx,toBlob:callback=>callback(new Blob(['png'],{type:'image/png'}))})}
 try{
  const blob=await renderer.selfInspectionImage(self.selfInspectionSnapshot(form,config),signature)
  assert.equal(blob.type,'image/png');for(const text of ['装修自检表','电话线','闭路线','宽带线路','可视分机','门磁','其他','厨房排水','主卫排水','生活阳台排水','业主签字：','处理状态：有问题'])assert.ok(calls.some(call=>call[0]==='text'&&call[1]===text),text)
  assert.equal(calls.filter(call=>call[0]==='signature').length,1);assert.equal(calls.find(call=>call[0]==='signature')[1],signature)
 }finally{globalThis.document=original}
})
test('修改自检项只使自检签署失效，后续施工信息不会使已签自检表失效',async()=>{
 const {reactive}=await import('vue'),draft=reactive({...form,selfInspectionItems:self.emptySelfInspectionItems(),signedDocuments:[]}),scope=effectScope()
 draft.signedDocuments=['selfInspection','material:test'].map(kind=>({kind,content:docs.documentContent(kind,draft,config),signatureFileId:'s',documentFileId:kind}))
 const vm=scope.run(()=>useSignedDocuments({},draft,()=>config))
 try{
  draft.constructionUnit='后续施工单位';await nextTick();assert.ok(vm.selfDocument.value)
  const document=vm.selfDocument.value;draft.signedDocuments=['selfInspection','material:test'].map(kind=>({kind,content:docs.documentContent(kind,draft,config),signatureFileId:'s',documentFileId:kind}))
  vm.updateSelfInspection('kitchenDrainage',false);await nextTick();assert.equal(vm.selfDocument.value,undefined);assert.equal(draft.signedDocuments.length,1);assert.notEqual(docs.documentContent('selfInspection',draft,config),document.content)
  assert.equal(self.selfInspectionComplete(draft.selfInspectionItems),true);draft.selfInspectionItems.pop();assert.equal(self.selfInspectionComplete(draft.selfInspectionItems),false)
 }finally{scope.stop()}
})
