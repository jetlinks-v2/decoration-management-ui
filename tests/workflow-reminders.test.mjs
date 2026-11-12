import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const result=await build({entryPoints:[fileURLToPath(new URL('../utils/applicationWorkflow.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs'})
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports)
const {ownerSteps,workflowReminder}=module.exports
const base={status:'reviewing',depositReviewStatus:0,paymentStatus:0,refundStatus:0,acceptanceType:0,details:{materials:[],refunds:[],agreement:{refundAmount:1000,deposit:1000}}}
test('全部审核通过才提醒缴费，完成卡片说明下一步',()=>{
 assert.equal(workflowReminder(base).step,'apply')
 const reviewed={...base,status:'pending_payment',depositReviewStatus:1}
 assert.equal(workflowReminder(reviewed).step,'pay');assert.match(workflowReminder(reviewed).message,/资料已全部通过审核，请进行费用缴纳/)
 assert.match(ownerSteps(reviewed)[0].description,/请进行费用缴纳/)
 const partiallyReviewed={...reviewed,details:{materials:[{definition:{id:'drawing',required:true,enabled:true},fileIds:['file'],reviewStatus:0}],refunds:[]}}
 assert.equal(workflowReminder(partiallyReviewed).step,'apply')
})
test('缴费、备案、两次验收、退款按真实回执提醒下一步',()=>{
 const paid={...base,status:'pending_permit',depositReviewStatus:1,paymentStatus:2}
 assert.equal(workflowReminder(paid).step,'permit')
 const issued={...paid,status:'permit_issued',permit:{downloadTime:1}}
 assert.equal(workflowReminder(issued).step,'first')
 assert.match(workflowReminder(issued,true).message,/发起首次验收/)
 const first={...issued,status:'pending_second_acceptance',acceptanceType:1}
 assert.equal(workflowReminder(first).step,'second');assert.match(workflowReminder(first).message,/首次验收已通过/)
 const second={...first,status:'acceptance_passed',acceptanceType:2}
 assert.equal(workflowReminder(second).step,'refund');assert.match(workflowReminder(second).message,/退款成功后/)
 const finished={...second,status:'finished',refundStatus:2,actualEndTime:1}
 assert.equal(workflowReminder(finished).tone,'success');assert.match(workflowReminder(finished).message,/办理结束/)
})
test('申请等待指派、验收不通过和历史不完整结束给出对应办理提示',()=>{
 const row={...base,depositReviewStatus:1,paymentStatus:2,permit:{downloadTime:1},status:'first_acceptance_waiting'}
 assert.match(workflowReminder(row).message,/等待物业安排/);assert.match(workflowReminder(row,true).message,/请指派/)
 assert.match(workflowReminder({...row,status:'first_acceptance_failed'}).message,/整改后重新申请/)
 assert.equal(workflowReminder({...row,status:'first_acceptance_failed'}).tone,'warning')
 assert.equal(workflowReminder({...row,status:'finished',refundStatus:0}).tone,'warning')
})
