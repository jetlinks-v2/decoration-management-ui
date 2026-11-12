import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const result=await build({entryPoints:[fileURLToPath(new URL('../utils/decoration.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs'})
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports)
const {applicationQueryTerms,applicationActionNames,canExtendPermit,isCompletedWorkflow,workflowStatus}=module.exports
const row={paymentStatus:2,status:'pending_permit',details:{workerRegistration:{workers:[]}}}
test('PC和小程序同时以二验通过及退款成功判断结束，时间和单个财务标志不能替代',()=>{
 for(const refundStatus of [0,1]){
  const unfinished={...row,status:'finished',actualEndTime:1,refundStatus}
  assert.equal(isCompletedWorkflow(unfinished),false);assert.equal(workflowStatus(unfinished),'refund_incomplete')
  assert.deepEqual(applicationActionNames(unfinished,false,{save:true,end:true},{refund:true}),[])
 }
 const settled={...row,status:'acceptance_passed',refundStatus:2}
 assert.equal(isCompletedWorkflow(settled),true);assert.equal(workflowStatus(settled),'finished')
 assert.deepEqual(applicationActionNames(settled,false,{save:true,end:true},{refund:true}),['actual-end-time'])
 assert.equal(isCompletedWorkflow({...settled,status:'finished'}),true)
 for(const status of ['reviewing','permit_issued','pending_second_acceptance','second_acceptance_failed']){
  assert.equal(isCompletedWorkflow({...settled,status}),false)
  assert.notEqual(workflowStatus({...settled,status}),'finished')
 }
 const active={...row,status:'acceptance_passed',refundStatus:0,details:{agreement:{refundAmount:1000}},paidAmount:1000}
 const actions=applicationActionNames(active,false,{save:true,end:true,refund:true},{refund:true})
 assert.ok(actions.includes('refund'));assert.equal(actions.includes('end'),false);assert.equal(actions.includes('actual-end-time'),false)
})
test('PC阶段查询以缴费、备案完成、首验通过依次收敛，用户OR不能覆盖门槛',()=>{
 const user=[{column:'ownerName',type:'or',value:'任意业主'}]
 assert.deepEqual(applicationQueryTerms('permits',user).slice(1),[{column:'paymentStatus',termType:'eq',value:2}])
 for(const mode of ['inspection','first','second']){
  const terms=applicationQueryTerms(mode,user,'project');assert.equal(terms[0].type,'and');assert.deepEqual(terms[0].terms,user)
  assert.equal(terms[1].column,'projectId');assert.equal(terms[2].termType,'decoration-permit-state')
  if(mode==='second')assert.equal(terms[3].terms[0].value.path,'firstAcceptancePassedTime')
 }
})
test('人员可独立登记，保存前不生成证件；巡检需打印或下载，延期限定七日窗口',()=>{
 const permissions={permit:true,extend:true,assign:true}
 assert.deepEqual(applicationActionNames({...row,details:{}},false,permissions,{}),['permit/workers'])
 assert.deepEqual(applicationActionNames(row,false,permissions,{}),['permit/workers','permit'])
 const issued={...row,permit:{endTime:Date.now()+30*86400000,prints:[{}]}}
 assert.equal(applicationActionNames(issued,false,permissions,{}).includes('inspection/assign'),false)
 assert.equal(canExtendPermit(issued),false)
 issued.permit.downloadTime=1;assert.ok(applicationActionNames(issued,false,permissions,{}).includes('inspection/assign'))
 issued.permit.endTime=Date.now()+86400000;assert.equal(canExtendPermit(issued),true)
 issued.actualEndTime=1;assert.equal(canExtendPermit(issued),false)
})
