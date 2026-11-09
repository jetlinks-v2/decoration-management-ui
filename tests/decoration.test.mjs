import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {effectScope,ref,nextTick} from 'vue'
const require=createRequire(import.meta.url)
async function load(entry){const result=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['vue']});const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);return module.exports}
const util=await load('../utils/decoration.ts'),{createDecorationApi}=await load('../services/decorationApi.ts'),{useApplicationForm}=await load('../hooks/decoration/useApplicationForm.ts'),{useApplicationDetail}=await load('../hooks/decoration/useApplicationDetail.ts'),session=await load('../mobile/session.ts')
const flush=async()=>{await nextTick();await new Promise(resolve=>setImmediate(resolve));await nextTick()}
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
const signed=await load('../utils/signedDocuments.ts')
function signForm(state){state.form.signedDocuments=Object.keys(signed.documentTitles).map(kind=>({kind,content:signed.documentContent(kind,state.form,state.configuration.value),signatureFileId:'sign-'+kind,documentFileId:'document-'+kind}))}
const home={relationshipId:'relation',spaceId:'house',customerId:'owner',telephone:'13800000000'}
const config={household:{spaceName:'测试房屋',customerName:'测试业主'},agreement:{title:'协议',content:'须知',supplements:[],deposit:1000},materials:[]}
function mounted(factory){const scope=effectScope();const value=scope.run(factory);return {value,stop:()=>scope.stop()}}
async function readyForm(api,project=ref('p')){const sent=[];const scope=mounted(()=>useApplicationForm(api,()=>project.value,row=>sent.push(row)));await flush();scope.value.selected.value='relation';await flush();Object.assign(scope.value.form,{startTime:1,completionTime:2,noticesAccepted:true,constructionUnit:'unit',constructionManager:'manager',managerPhone:'13900000000',ownerCertificate:'11010519491231002X',managerCertificate:'11010519491231002X'});if(scope.value.configuration.value?.agreement?.supplements)signForm(scope.value);return {...scope,sent,project}}
function formApi(overrides={}){return {households:async()=>[home],form:async()=>config,create:async()=>({id:'new'}),...overrides}}
function detailApi(overrides={}){return {read:async id=>({id,version:1}),tasks:async()=>({data:[],total:0}),history:async()=>[],capabilities:async()=>({payment:false,refund:false,pushNotification:false}),...overrides}}

test('项目树保留祖先，仅稳定project类型可选，筛选条件外层保持AND',()=>{const tree=util.projectTree([{id:'a',name:'集团',organizationType:'company',children:[{id:'p',name:'园区',organizationType:{value:'project',text:'项目'}}]}]);assert.equal(tree[0].disabled,true);assert.equal(tree[0].children[0].selectable,true);assert.deepEqual(util.projectTerms([{type:'or',column:'ownerName',value:'x'}],'p'),[{type:'and',terms:[{type:'or',column:'ownerName',value:'x'}]},{column:'projectId',termType:'eq',value:'p'}])})
test('本人接口、附件FormData、只读结果核对和导出传输保持统一契约',async()=>{const calls=[],api=createDecorationApi(async(...args)=>{calls.push(args);return {}},true);await api.read('a/b');await api.creationResult('same');await api.actionResult('id','same');await api.upload(new File(['x'],'图纸.pdf'),'p','id');assert.equal(calls[0][0],'/decoration/mobile/applications/a%2Fb');assert.equal(calls[1][1],'GET');assert.equal(calls[2][1],'GET');assert.ok(calls[3][2] instanceof FormData);assert.equal(calls[3][2].get('file').name,'图纸.pdf');assert.match(calls[3][0],/projectId=p/)})
test('必填资料缺失阻止提交',async()=>{let writes=0;const scope=await readyForm(formApi({form:async()=>({agreement:{},materials:[{id:'required',enabled:true,required:true,name:'身份证'}]}),create:async()=>{writes++}}));await scope.value.submit();assert.equal(writes,0);assert.match(scope.value.error.value,/身份证/);scope.stop()})
test('申请超时先只读核对，人工重试保留原请求键和冻结表单',async()=>{const writes=[];let lookups=0;const scope=await readyForm(formApi({create:async body=>{writes.push(structuredClone(body));if(writes.length===1)throw new TypeError('network');return {id:'created'}},creationResult:async()=>{lookups++;throw Object.assign(new Error('not found'),{status:404})}}));await scope.value.submit();assert.equal(scope.value.uncertain.value,true);await scope.value.submit();assert.equal(writes.length,1);await scope.value.confirmResult();assert.equal(lookups,1);assert.equal(writes.length,1);assert.equal(scope.value.resultMissing.value,true);scope.value.form.constructionUnit='accidental edit';await scope.value.retryOriginal();assert.equal(writes[0].requestId,writes[1].requestId);assert.equal(writes[1].constructionUnit,'unit');assert.equal(scope.sent[0].id,'created');scope.stop()})
test('项目切换清空全部草稿并丢弃旧提交响应',async()=>{const pending=deferred(),scope=await readyForm(formApi({create:()=>pending.promise}));const write=scope.value.submit();scope.project.value='next';await flush();assert.equal(scope.value.form.constructionUnit,'');assert.equal(scope.value.form.noticesAccepted,false);assert.equal(scope.value.form.spaceId,'');assert.equal(scope.value.households.value.length,1);pending.resolve({id:'old'});await write;assert.equal(scope.sent.length,0);scope.stop()})
test('旧资料配置晚到不能覆盖新房屋或装修类型',async()=>{const old=deferred();let reads=0;const scope=mounted(()=>useApplicationForm(formApi({form:()=>++reads===1?old.promise:Promise.resolve({agreement:{title:'new'},materials:[]})}),()=> 'p',()=>{}));await flush();scope.value.selected.value='relation';await flush();scope.value.form.decorationType='second';await flush();old.resolve({agreement:{title:'old'},materials:[]});await flush();assert.equal(scope.value.configuration.value.agreement.title,'new');scope.stop()})
test('详情超时后刷新仍保持待确认，只读查询不会重做动作',async()=>{let writes=0,queries=0;const scope=mounted(()=>useApplicationDetail(detailApi({action:async()=>{writes++;throw new TypeError('timeout')},actionResult:async()=>{queries++;return {id:'id',version:2}}}),()=> 'id'));await flush();await scope.value.execute('end',{remark:'取消'});assert.equal(scope.value.uncertain.value,true);await scope.value.load();assert.equal(scope.value.uncertain.value,true);await scope.value.execute('end');assert.equal(writes,1);await scope.value.confirm();assert.equal(queries,1);assert.equal(writes,1);assert.equal(scope.value.uncertain.value,false);scope.stop()})
test('详情切换后旧请求不会覆盖新记录',async()=>{const old=deferred(),id=ref('old');const scope=mounted(()=>useApplicationDetail(detailApi({read:value=>value==='old'?old.promise:Promise.resolve({id:value,version:1})}),()=>id.value));id.value='new';await flush();old.resolve({id:'old',version:1});await flush();assert.equal(scope.value.row.value.id,'new');scope.stop()})
test('H5会话不接受跨域API、无效入口或缺失应用，业务项目不参与身份授权',()=>{assert.throws(()=>session.browserSession('entry','app',null,'platform','https://example.com'),/尚未登录/);assert.throws(()=>session.browserSession('entry','app',JSON.stringify({token:'secret',apiUrl:'https://evil.test/api'}),null,'https://example.com'),/同源/);const value=session.browserSession('entry','app',JSON.stringify({token:'secret',domain:'app'}),null,'https://example.com');assert.equal(value.tenant,undefined);assert.throws(()=>session.validateContext({userId:'u',applicationId:'app'}),/重新进入/);for(const path of ['https://evil/decoration/a','/decoration/../authorize','/decoration/%2e%2e/authorize'])assert.throws(()=>session.validatePath(path));assert.equal(session.identity({userId:'u',applicationId:'a',sessionEntryCode:'e',businessProjectId:'one'}),session.identity({userId:'u',applicationId:'a',sessionEntryCode:'e',businessProjectId:'two'}))})

test('核对结果晚到不得覆盖已切换的申请，二次查询失败可展示错误',async()=>{const pending=deferred(),id=ref('old');const scope=mounted(()=>useApplicationDetail(detailApi({action:async()=>{throw new TypeError('timeout')},actionResult:()=>pending.promise}),()=>id.value));await flush();await scope.value.execute('end');const checking=scope.value.confirm();id.value='new';await flush();pending.resolve({id:'old',version:2});await checking;assert.equal(scope.value.row.value.id,'new');assert.equal(scope.value.saving.value,false);scope.stop();let reads=0;const failed=mounted(()=>useApplicationDetail(detailApi({read:async()=>{if(++reads>1)throw new Error('核对网络失败');return {id:'id',version:1}},action:async()=>{throw new TypeError('timeout')},actionResult:async()=>{throw Object.assign(new Error('not found'),{status:404})}}),()=> 'id'));await flush();await failed.value.execute('end');await failed.value.confirm();assert.equal(failed.value.uncertain.value,true);assert.match(failed.value.error.value,/核对网络失败/);failed.stop()})
test('签名上传完成前切换项目不回填旧文件回执',async()=>{const {reactive}=require('vue'),{useSignature}=await load('../hooks/decoration/useSignature.ts'),pending=deferred(),saved=[];const props=reactive({projectId:'old',api:{upload:()=>pending.promise}});const canvas=ref({toBlob:cb=>cb(new Blob(['png'])),getContext:()=>({clearRect(){}})});const scope=mounted(()=>useSignature(canvas,props,id=>saved.push(id)));scope.value.signed.value=true;const write=scope.value.save();await flush();props.projectId='new';await flush();pending.resolve({id:'old-file'});await write;assert.deepEqual(saved,[]);assert.equal(scope.value.signed.value,false);scope.stop()})


test('资料与图纸分别汇总：驳回优先，已上传选填资料仍须审核，空选填不阻塞',()=>{
 const material=(kind,required,files,status)=>({definition:{kind,required},fileIds:files,reviewStatus:status})
 assert.equal(util.materialReviewState([],'material'),'notRequired')
 assert.equal(util.materialReviewState([material('material',false,[],0)],'material'),'notRequired')
 const items=[material('material',true,['a'],1),material('material',false,['b'],0),material('drawing',true,['c'],2)]
 assert.equal(util.materialReviewState(items,'material'),'pending')
 assert.equal(util.materialReviewState(items,'drawing'),'rejected')
 items[1].reviewStatus=1
 assert.equal(util.materialReviewState(items,'material'),'approved')
 items[0].reviewStatus=2
 assert.equal(util.materialReviewState(items,'material'),'rejected')
 assert.equal(util.materialReviewState([material('drawing',true,[],0)],'drawing'),'pending')
})


test('巡检记录保留正常反馈，违规列表排除正常记录，固定类型和项目不会被OR条件替代',()=>{
 const filters=[{column:'spaceName',termType:'like',value:'A'},{type:'or',column:'ownerName',termType:'like',value:'B'}]
 const all=util.taskQueryTerms('inspectionRecord',filters,'project',true)
 assert.deepEqual(all,[{type:'and',terms:filters},{column:'projectId',termType:'eq',value:'project'},{column:'kind',termType:'eq',value:'inspectionRecord'}])
 const violations=util.taskQueryTerms('inspectionRecord',filters,'project')
 assert.deepEqual(violations.slice(0,-1),all)
 assert.deepEqual(violations.at(-1),{column:'status',termType:'not',value:'passed'})
 const cleared=util.taskQueryTerms('firstAcceptance',[],undefined)
 assert.equal(cleared.some(term=>term.column==='projectId'),false)
 assert.equal(cleared.find(term=>term.column==='kind').value,'firstAcceptance')
})
test('任务状态选项按页面对象提供，正常巡检记录可筛选且不混入验收结果',()=>{
 assert.deepEqual(util.taskStatusKeys('daily'),['pending','completed'])
 assert.deepEqual(util.taskStatusKeys('firstAcceptance'),['pending','passed','failed'])
 assert.equal(util.taskStatusKeys('inspectionRecord').includes('passed'),false)
 assert.equal(util.taskStatusKeys('inspectionRecord',true).includes('passed'),true)
 assert.equal(util.taskStatusKeys('inspectionRecord',true).includes('failed'),false)
})

test('验收申请必须选择日期，指派不要求重填，切换动作清空前一申请日期',async()=>{
 const {useActionForm}=await load('../hooks/decoration/useActionForm.ts'),action=ref('acceptance'),sent=[]
 const scope=mounted(()=>useActionForm({employees:async()=>({data:[]})},()=>action.value,(...args)=>sent.push(args)))
 await flush();scope.value.submit();assert.equal(sent.length,0);assert.match(scope.value.error.value,/验收日期/)
 scope.value.form.acceptanceDate=1900000000000;scope.value.form.type=2;scope.value.submit()
 assert.equal(sent.length,1);assert.equal(sent[0][0],'acceptance');assert.equal(sent[0][1].acceptanceDate,1900000000000);assert.equal(sent[0][1].type,2)
 action.value='acceptance/assign';await flush();assert.equal(scope.value.form.acceptanceDate,undefined)
 scope.value.submit();assert.equal(sent.length,2);assert.equal(sent[1][2],true)
 action.value='acceptance';await flush();scope.value.submit();assert.equal(sent.length,2);scope.stop()
})

// SQL 的 AND 优先于 OR；用不同状态和项目的记录验证表达式含义。
function matchesTerms(row,terms){
 const groups=[]
 for(const term of terms){
  const value=term.terms?matchesTerms(row,term.terms):term.termType==='in'?term.value.includes(row[term.column]):row[term.column]===term.value
  if(!groups.length||term.type==='or')groups.push(value);else groups[groups.length-1]&&=value
 }
 return !groups.length||groups.some(Boolean)
}
test('审核列表保留已审核记录；用户OR条件不能改变备案和验收页面范围',()=>{
 const rows=[
  {id:'reviewed',projectId:'p',status:'pending_payment',ownerName:'A',paymentStatus:0,acceptanceType:0,source:'pc_admin'},
  {id:'paid',projectId:'p',status:'permit_issued',ownerName:'A',paymentStatus:2,acceptanceType:1},
  {id:'other',projectId:'other',status:'reviewing',ownerName:'B',paymentStatus:2,acceptanceType:2},
 ]
 const filters=[{column:'ownerName',termType:'eq',value:'A'},{type:'or',column:'ownerName',termType:'eq',value:'B'}]
 const ids=mode=>rows.filter(row=>matchesTerms(row,util.applicationQueryTerms(mode,filters,'p'))).map(row=>row.id)
 assert.deepEqual(ids('review'),['reviewed','paid'])
 assert.deepEqual(ids('permits'),['reviewed','paid'])
 assert.deepEqual(ids('first'),['paid'])
 assert.deepEqual(ids('second'),[])
 assert.equal(util.applicationQueryTerms('review',[],undefined).some(term=>term.column==='projectId'),false)
})
test('配置名称的OR条件不能混入其他类别或其他项目',()=>{
 const rows=[{id:'ok',projectId:'p',kind:'checks',name:'A'},{id:'wrong-kind',projectId:'p',kind:'materials',name:'A'},{id:'wrong-project',projectId:'other',kind:'checks',name:'B'}]
 const filters=[{column:'name',termType:'eq',value:'A'},{column:'name',termType:'eq',value:'B',type:'or'}]
 assert.deepEqual(rows.filter(row=>matchesTerms(row,util.configurationQueryTerms('checks',filters,'p'))).map(row=>row.id),['ok'])
})
test('备案状态按打印、到期和延期快照显示，过期优先于延期',()=>{
 const permit={printTime:10,endTime:100,extensions:[]}
 assert.equal(util.permitStatus(undefined,100),'pending')
 assert.equal(util.permitStatus({...permit,printTime:undefined,extensions:[{}]},101),'pending')
 assert.equal(util.permitStatus(permit,100),'issued')
 assert.equal(util.permitStatus({...permit,extensions:[{}]},100),'extended')
 assert.equal(util.permitStatus({...permit,extensions:[{}]},101),'expired')
})
test('备案状态及打印时间映射保留嵌套逻辑和页面边界',()=>{
 const user=[{column:'permitStatus',termType:'nin',value:['expired']},{type:'or',terms:[{column:'printTime',termType:'btw',value:[100,200]}]}]
 const result=util.applicationQueryTerms('permits',user,'p')
 assert.equal(result[0].terms[0].termType,'decoration-permit-state$not')
 assert.equal(result[0].terms[0].column,'permit')
 assert.equal(result[0].terms[1].type,'or')
 const range=result[0].terms[1].terms[0].terms
 assert.deepEqual(range.map(term=>term.value),[{path:'printTime',termType:'gte',value:100},{path:'printTime',termType:'lte',value:200}])
 assert.equal(result.at(-1).terms[0].column,'paymentStatus')
 const negative=util.applicationFilterTerms([{column:'printTime',termType:'nbtw',value:[100,200]}])[0].terms
 assert.equal(negative[1].type,'or');assert.equal(negative[0].value.termType,'lt');assert.equal(negative[1].value.termType,'gt')
 assert.equal(util.applicationFilterTerms([{column:'printTime',termType:'isnull',value:1}])[0].value.value,null)
 assert.deepEqual(util.applicationFilterTerms([{column:'permitStatus',termType:'in',value:[]},{column:'printTime',termType:'btw',value:[null,null]},{column:'printTime',termType:'gte',value:''}]),[])
})

test('记录生效中使用许可开区间，缺许可、边界和过期均不生效',()=>{
 const permit={startTime:100,endTime:200}
 assert.equal(util.permitIsActive(undefined,150),false)
 assert.equal(util.permitIsActive({startTime:100},150),false)
 assert.equal(util.permitIsActive(permit,100),false)
 assert.equal(util.permitIsActive(permit,150),true)
 assert.equal(util.permitIsActive({...permit,printTime:undefined},150),true)
 assert.equal(util.permitIsActive(permit,200),false)
 assert.equal(util.permitIsActive(permit,201),false)
})
test('已结束装修仅管理端有权更正实际结束时间，收退款按钮按各自能力控制',()=>{
 const row={details:{agreement:{}},status:'permit_issued',paymentStatus:2,permit:{printTime:1},acceptanceType:0},all={save:true,end:true,extend:true,print:true,assign:true,acceptance:true,refund:true,payment:true},none={payment:false,refund:false,pushNotification:false}
 const active=util.applicationActionNames(row,false,all,none)
 assert.ok(active.includes('actual-end-time'));assert.ok(active.includes('completion-time'));assert.ok(active.includes('end'))
 assert.deepEqual(util.applicationActionNames({...row,actualEndTime:100},false,all,none),['actual-end-time'])
 assert.deepEqual(util.applicationActionNames({...row,actualEndTime:100},false,{},none),[])
 assert.deepEqual(util.applicationActionNames({...row,actualEndTime:100},true,all,none),[])
 assert.equal(util.applicationActionNames(row,true,all,none).includes('actual-end-time'),false)
 assert.equal(util.applicationActionNames({...row,status:'acceptance_passed'},false,all,none).includes('refund'),false)
 assert.equal(util.applicationActionNames({...row,status:'acceptance_passed'},false,all,{...none,refund:true}).includes('refund'),true)
 assert.equal(util.applicationActionNames({...row,status:'pending_payment'},false,all,{...none,refund:true}).includes('payment'),false)
})
test('修改实际结束时间回显现值、必填且仅提交实际日期，切换动作清除旧值',async()=>{
 const {useActionForm}=await load('../hooks/decoration/useActionForm.ts'),action=ref('actual-end-time'),sent=[]
 const scope=mounted(()=>useActionForm({},()=>action.value,(...args)=>sent.push(args),()=>action.value==='actual-end-time'?{actualEndTime:1900000000000}:{}))
 assert.equal(scope.value.form.actualEndTime,1900000000000)
 scope.value.form.actualEndTime=undefined;scope.value.submit();assert.equal(sent.length,0);assert.match(scope.value.error.value,/实际结束时间/)
 scope.value.form.actualEndTime=1900000001000;scope.value.submit();assert.equal(sent[0][0],'actual-end-time');assert.equal(sent[0][1].actualEndTime,1900000001000);assert.equal(sent[0][1].completionTime,undefined);assert.equal(sent[0][2],false)
 action.value='completion-time';await flush();assert.equal(scope.value.form.actualEndTime,undefined);scope.stop()
})

test('公开角色候选保留名称，按关键字远程查询，晚到搜索不覆盖新结果，失败清空并显示错误',async()=>{
 const {useRoleOptions}=await load('../hooks/decoration/useRoleOptions.ts'),old=deferred(),calls=[]
 const scope=mounted(()=>useRoleOptions({roles:async query=>{calls.push(query);const keyword=query.terms[0]?.value;if(keyword==='%old%')return old.promise;if(keyword==='%bad%')throw new Error('角色目录不可用');return {data:[{id:'r',name:'审核角色'}],total:1}}}))
 const slow=scope.value.search('old');await scope.value.search('new');assert.deepEqual(scope.value.roles.value,[{id:'r',name:'审核角色'}]);assert.equal(calls[1].terms[0].column,'name')
 old.resolve({data:[{id:'outdated',name:'旧角色'}]});await slow;assert.equal(scope.value.roles.value[0].id,'r')
 await scope.value.search('bad');assert.deepEqual(scope.value.roles.value,[]);assert.match(scope.value.error.value,/不可用/)
 await scope.value.search();assert.equal(scope.value.error.value,'');scope.stop()
})

test('巡检按角色配置天数，远程搜索和修改保留已选周期，提交不再携带总次数',async()=>{
 const {useActionForm}=await load('../hooks/decoration/useActionForm.ts'),action=ref('inspection/assign'),sent=[]
 const scope=mounted(()=>useActionForm({roles:async()=>({data:[{id:'a',name:'工程角色'},{id:'b',name:'秩序角色'}]})},()=>action.value,(...args)=>sent.push(args)))
 await flush();scope.value.changeRoles(['a','b']);scope.value.form.inspectionRoles[0].intervalDays=2;scope.value.form.inspectionRoles[1].intervalDays=3
 scope.value.changeRoles(['b','a']);assert.equal(scope.value.form.inspectionRoles[1].intervalDays,2)
 assert.deepEqual(scope.value.selectedRoles.value,['b','a']);scope.value.submit();assert.equal(sent.length,0)
 Object.assign(scope.value.form,{auditRoleId:'a',reviewRoleId:'b',startTime:100,endTime:200})
 scope.value.submit();assert.equal(sent.length,1);assert.equal(sent[0][0],'inspection/assign');assert.equal(sent[0][2],true)
 assert.equal(sent[0][1].frequency,undefined);assert.equal(sent[0][1].assigneeId,undefined)
 assert.deepEqual(sent[0][1].inspectionRoles.map(role=>role.intervalDays),[3,2]);scope.stop()
})
test('巡检指派入口查已发证申请，日期任务保持独立查询范围',()=>{
 const fixed=util.applicationQueryTerms('inspection',[{column:'status',value:'finished'}],'p')
 assert.deepEqual(fixed.at(-1),{column:'permit',termType:'notnull'})
 assert.deepEqual(util.taskQueryTerms('daily',[],'p').at(-1),{column:'kind',termType:'eq',value:'daily'})
})
test('角色选中名称在下一次搜索和目录失败后仍可回显，失败不伪装新候选',async()=>{
 const {useRoleOptions}=await load('../hooks/decoration/useRoleOptions.ts');let read=0
 const scope=mounted(()=>useRoleOptions({roles:async()=>{if(++read===1)return {data:[{id:'a',name:'工程角色'}]};if(read===2)return {data:[{id:'b',name:'复核角色'}]};throw new Error('目录故障')}},()=>[{id:'original',name:'原审核角色'}]))
 await scope.value.search();await scope.value.search('复核');assert.deepEqual(scope.value.options(['a','original']).map(role=>role.name),['复核角色','工程角色','原审核角色'])
 await scope.value.search('失败');assert.equal(scope.value.roles.value.length,0);assert.equal(scope.value.error.value,'目录故障');assert.equal(scope.value.options(['a'])[0].name,'工程角色');scope.stop()
})


test('PC与H5共用申请校验，非法电话或身份证阻止写入且保留原草稿',async()=>{
 let writes=0;const scope=await readyForm(formApi({create:async()=>{writes++;return {id:'new'}}}))
 try{
  scope.value.form.contactPhone='123';await scope.value.submit();assert.match(scope.value.error.value,/业主联系电话/);assert.equal(writes,0)
  scope.value.form.contactPhone='010-12345678';scope.value.form.managerPhone='123';await scope.value.submit();assert.match(scope.value.error.value,/施工负责人联系电话/);assert.equal(writes,0)
  scope.value.form.managerPhone='13900000000';scope.value.form.ownerCertificate='';await scope.value.submit();assert.match(scope.value.error.value,/业主身份证/)
  scope.value.form.ownerCertificate='11010519491231002x';scope.value.form.managerCertificate='invalid';await scope.value.submit();assert.match(scope.value.error.value,/施工负责人身份证/);assert.equal(writes,0)
  scope.value.form.managerCertificate='130503670401001';signForm(scope.value);await scope.value.submit();assert.equal(writes,1);assert.equal(scope.sent[0].id,'new')
 }finally{scope.stop()}
})

test('冻结退款总额仅二验后一次性开放，历史已退金额从总额扣除',()=>{
 const row={paymentStatus:2,refundStatus:0,status:'pending_second_acceptance',paidAmount:1000,details:{agreement:{firstRefund:600,secondRefund:400},firstAcceptancePassedTime:1,refunds:[]}}
 assert.equal(util.nextRefund(row),undefined)
 row.status='acceptance_passed';assert.deepEqual(util.nextRefund(row),{stage:'single',label:'二次验收后一次性退款',amount:1000})
 row.refundedAmount=600;assert.equal(util.nextRefund(row).amount,400)
 row.details.agreement.refundAmount=900;assert.equal(util.nextRefund(row).amount,300)
 row.details.agreement.refundAmount=600;assert.equal(util.nextRefund(row).amount,0)
 row.refundStatus=2;assert.equal(util.nextRefund(row),undefined)
})

test('新证打印后待领取，领取后可验收，延期重新待领且旧版领取不冒充新版',()=>{
 const printed={printTime:10,prints:[{endTime:100,snapshotFileId:'v1'}],endTime:100,extensions:[]}
 const row={permit:printed,acceptanceType:0,status:'pending_permit',paymentStatus:2}
 assert.equal(util.permitStatus(printed,20),'pending');assert.equal(util.canRequestAcceptance(row,1),false)
 assert.ok(util.applicationActionNames(row,false,{print:true},{}).includes('permit/collect'))
 const received={...printed,collectedTime:11}
 assert.equal(util.permitStatus(received,20),'issued');assert.equal(util.canRequestAcceptance({...row,permit:received},1),true)
 assert.equal(util.applicationActionNames({...row,permit:received},false,{print:true},{}).includes('permit/collect'),false)
 const extended={...printed,printTime:undefined,collectedTime:undefined,endTime:200,extensions:[{}]}
 assert.equal(util.permitStatus(extended,20),'pending');assert.equal(util.canRequestAcceptance({...row,permit:extended},1),false)
 assert.equal(util.applicationActionNames({...row,permit:extended},false,{print:true},{}).includes('permit/collect'),false)
 assert.equal(util.permitReceived({printTime:10}),true)
})
