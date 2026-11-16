import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import assert from 'node:assert/strict'
const built=await build({entryPoints:[fileURLToPath(new URL('../utils/checkFeedback.ts',import.meta.url))],bundle:true,write:false,format:'cjs',platform:'node'})
const module={exports:{}}
new Function('require','module','exports',built.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports)
const {checkFeedback}=module.exports
const checks=[{id:'wall',category:'竣工检查',name:'墙面恢复',enabled:true,required:true,inputType:'text'},{id:'pipe',category:'隐蔽工程',name:'排水',enabled:true,required:true,inputType:'number'},{id:'disabled',name:'已停用',enabled:false,required:true}]
const valid=[{itemId:'wall',qualified:true,value:'已恢复',fileIds:[],rectification:'旧内容',deadline:1},{itemId:'pipe',qualified:true,value:'0',fileIds:[]}]
test('全部合格自动通过，零值有效，旧整改内容和期限不进入提交且原草稿不变',()=>{
 const result=checkFeedback(checks,valid,1900000000000)
 assert.equal(result.passed,true);assert.equal(result.error,'');assert.equal(result.needsDeadline,false)
 assert.deepEqual(result.violations,[]);assert.equal(result.results[0].rectification,undefined);assert.equal(result.results[0].deadline,undefined)
 assert.equal(valid[0].rectification,'旧内容');assert.equal(valid[0].deadline,1)
})
test('不合格必须填整改内容，提交统一日期后每项带同一期限并生成巡检违规内容',()=>{
 const values=valid.map(value=>({...value,qualified:false,rectification:'  修复并清理  ',fileIds:['evidence']}))
 const missing=checkFeedback(checks,[{...values[0],rectification:'  '},values[1]])
 assert.match(missing.error,/墙面恢复.*整改内容/);assert.equal(missing.needsDeadline,false)
 const pending=checkFeedback(checks,values)
 assert.equal(pending.passed,false);assert.equal(pending.needsDeadline,true)
 const complete=checkFeedback(checks,values,1900000000000)
 assert.equal(complete.needsDeadline,false);assert.equal(complete.passed,false)
 assert.ok(complete.results.every(value=>value.deadline===1900000000000))
 assert.deepEqual(complete.violations,[{location:'竣工检查 · 墙面恢复',rectification:'修复并清理',fileIds:['evidence']},{location:'隐蔽工程 · 排水',rectification:'修复并清理',fileIds:['evidence']}])
})
test('保留配置要求的记录和图片校验，仅提交启用项',()=>{
 assert.match(checkFeedback(checks,[]).error,/墙面恢复.*结果/)
 const image=[{id:'image',name:'现场取证',enabled:true,required:true,inputType:'image'}]
 assert.match(checkFeedback(image,[{itemId:'image',qualified:true,value:'有照片',fileIds:[]}]).error,/现场取证/)
 assert.equal(checkFeedback(image,[{itemId:'image',qualified:true,fileIds:['photo']}]).passed,true)
 assert.equal(checkFeedback(checks,[...valid,{itemId:'disabled',qualified:false,fileIds:[]}]).passed,true)
})
