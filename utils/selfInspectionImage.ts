import type {SelfInspectionSnapshot} from './selfInspection'

/** 将完整自检表和实际手写签名合成同一张PNG，预览和归档不依赖当前页面布局。 */
export async function selfInspectionImage(snapshot:SelfInspectionSnapshot,signature:HTMLImageElement):Promise<Blob>{
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1390
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器不支持自检表生成')
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height)
 ctx.fillStyle='#202020';ctx.textBaseline='middle';ctx.textAlign='center';ctx.font='bold 36px sans-serif';ctx.fillText('装修自检表',500,65)
 ctx.textAlign='left';ctx.font='24px sans-serif'
 snapshot.metadata.forEach((line,index)=>ctx.fillText(line,60,130+index*42,880))
 ctx.font='22px sans-serif';ctx.fillText('请与装修师傅确认以下项目是否完好/通畅？',60,275)
 let y=310
 for(const group of snapshot.groups){
  const rowHeight=60,tableHeight=(group.items.length+1)*rowHeight
  ctx.fillStyle='#f5f7fa';ctx.fillRect(60,y,880,rowHeight)
  ctx.strokeStyle='#b7bec7';ctx.lineWidth=1;ctx.strokeRect(60,y,880,tableHeight)
  ctx.beginPath();ctx.moveTo(620,y);ctx.lineTo(620,y+tableHeight);ctx.stroke()
  ctx.fillStyle='#202020';ctx.font='bold 24px sans-serif';ctx.fillText('检测项目',85,y+30);ctx.fillText(group.optionTitle,655,y+30)
  ctx.font='24px sans-serif'
  group.items.forEach((item,index)=>{
   const top=y+(index+1)*rowHeight
   ctx.beginPath();ctx.moveTo(60,top);ctx.lineTo(940,top);ctx.stroke()
   ctx.fillText(item.text,85,top+30)
   ctx.fillText(`${item.value===true?'☑':'□'} 是       ${item.value===false?'☑':'□'} 否`,655,top+30)
  })
  y+=tableHeight+28
 }
 ctx.font='24px sans-serif';ctx.fillText(`处理状态：${snapshot.status===1?'有问题':'没问题'}`,60,y+12)
 ctx.fillText('业主签字：',60,y+100)
 // 保持签名纵横比，透明签名叠在白底表单上。
 const width=Math.min(530,signature.naturalWidth*160/signature.naturalHeight),height=width*signature.naturalHeight/signature.naturalWidth
 ctx.drawImage(signature,230,y+45,width,height)
 const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now())
 ctx.fillText(`日期：${date}`,60,canvas.height-55)
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('自检表图片生成失败')),'image/png'))
}
