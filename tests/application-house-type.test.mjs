import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {effectScope,nextTick} from 'vue'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const built=await build({entryPoints:[fileURLToPath(new URL('../hooks/decoration/useApplicationForm.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue'],plugins:[{name:'upload-context',setup(builder){
 builder.onResolve({filter:/useUploadScope$/},()=>({path:'upload',namespace:'test-context'}))
 builder.onLoad({filter:/.*/,namespace:'test-context'},()=>({contents:'import {ref} from "vue";export const provideUploadScope=()=>({uploading:ref(false)})'}))
}}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const house=(id,type)=>({relationshipId:id,spaceId:id,projectId:'p',customerId:'owner',houseType:type,telephone:'13800000000'})

test('申请展示基础档案房屋类型，配置失败及切换房屋时仍展示当前房屋，不提交客户端房屋类型',async()=>{
 const scope=effectScope(),calls=[];let state
 const first=house('first','residential'),second=house('second','office')
 const api={mine:false,households:async()=>[first,second],form:async(...args)=>{calls.push(args);if(args[1]==='second')throw new Error('缺少办公类型配置');return {household:{...first,houseType:'commercial'},materials:[],selfInspections:[]}}}
 scope.run(()=>state=module.exports.useApplicationForm(api,()=> 'p',()=>{}))
 try{
  await flush();assert.equal(state.selectedHousehold.value,undefined)
  state.selected.value='first';await flush()
  assert.equal(state.selectedHousehold.value.houseType,'commercial')
  assert.deepEqual(calls[0],['p','first','owner','first'])
  assert.equal('houseType' in state.form,false)
  state.selected.value='second';await flush()
  assert.equal(state.configuration.value,undefined)
  assert.equal(state.selectedHousehold.value.houseType,'office')
  assert.match(state.error.value,/办公/)
 }finally{scope.stop()}
})

test('旧配置响应晚到不能覆盖切换后房屋类型',async()=>{
 const scope=effectScope();let state,finish
 const api={mine:false,households:async()=>[house('first','residential'),house('second','office')],form:async(_,space)=>space==='first'?new Promise(resolve=>finish=resolve):{household:house('second','office'),materials:[]}}
 scope.run(()=>state=module.exports.useApplicationForm(api,()=> 'p',()=>{}))
 try{
  await flush();state.selected.value='first';await flush();state.selected.value='second';await flush()
  finish({household:house('first','residential'),materials:[]});await flush()
  assert.equal(state.selectedHousehold.value.houseType,'office')
 }finally{scope.stop()}
})


test('自装不要求施工方资料，装修公司仍必填；切换自装清空公司信息后可提交',async()=>{
 const scope=effectScope(),submitted=[];let state
 const api={mine:false,households:async()=>[house('first','residential')],form:async()=>({household:house('first','residential'),materials:[],selfInspections:[]}),create:async row=>{submitted.push(JSON.parse(JSON.stringify(row)));return {id:'created'}}}
 scope.run(()=>state=module.exports.useApplicationForm(api,()=> 'p',()=>{}))
 try{
  await flush();state.selected.value='first';await flush()
  Object.assign(state.form,{contactPhone:'13800000000',ownerCertificate:'11010519491231002X',startTime:1,completionTime:2,noticesAccepted:true,selfInspectionFiles:['signed-form']})
  await state.submit();assert.equal(submitted.length,0);assert.match(state.error.value,/施工单位/)
  Object.assign(state.form,{constructionUnit:'公司',constructionManager:'负责人',managerPhone:'13900000000',managerCertificate:'11010519491231002X'})
  state.form.constructionType=2
  for(const key of ['constructionUnit','constructionManager','managerPhone','managerCertificate'])assert.equal(state.form[key],'')
  await state.submit();assert.equal(submitted.length,1);assert.equal(submitted[0].constructionType,2)
  state.form.constructionType=1
  await state.submit();assert.equal(submitted.length,1);assert.match(state.error.value,/施工单位/)
  Object.assign(state.form,{constructionUnit:'公司',constructionManager:'负责人',managerPhone:'13900000000',managerCertificate:'11010519491231002X'})
  await state.submit();assert.equal(submitted.length,2);assert.equal(submitted[1].constructionManager,'负责人')
 }finally{scope.stop()}
})
