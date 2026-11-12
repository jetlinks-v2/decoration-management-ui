/** 模板各页与申请信息、手写签字合成原图；限制画布大小以适配移动浏览器。 */
export async function materialDocumentImage(content:string,pages:string[],signature:HTMLImageElement):Promise<Blob>{
 if(!pages.length)throw new Error('请先加载资料模板正文')
 const images=await Promise.all(pages.map(async url=>{const image=new Image();image.src=url;await image.decode();return image}))
 const canvas=document.createElement('canvas');canvas.width=1000
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('浏览器不支持资料签署')
 ctx.font='22px sans-serif'
 const lines:string[]=[]
 for(const paragraph of content.split('\n')){let line='';for(const char of paragraph){if(ctx.measureText(line+char).width>880){lines.push(line);line=''}line+=char}lines.push(line)}
 // 长协议缩放正文以容纳原件全部页面；保留至少600px正文宽度，避免图片不可读。
 const originalHeights=images.map(image=>880*image.naturalHeight/image.naturalWidth)
 const available=16000-100-lines.length*34-images.length*20-300
 const scale=Math.min(1,available/originalHeights.reduce((sum,height)=>sum+height,0))
 if(scale*880<600)throw new Error('签署图片过长，请联系物业拆分资料模板')
 const imageHeights=originalHeights.map(height=>height*scale),width=880*scale
 const height=Math.ceil(100+lines.length*34+imageHeights.reduce((sum,height)=>sum+height+20,0)+300)
 canvas.height=height
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#202020';ctx.font='22px sans-serif'
 lines.forEach((line,index)=>ctx.fillText(line,60,60+index*34));let y=90+lines.length*34
 images.forEach((image,index)=>{ctx.drawImage(image,(1000-width)/2,y,width,imageHeights[index]);y+=imageHeights[index]+20})
 ctx.fillText('业主签字确认：',60,y+55);ctx.drawImage(signature,250,y+10,530,530*signature.naturalHeight/signature.naturalWidth)
 ctx.fillText(`日期：${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(Date.now())}`,60,canvas.height-45)
 return new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('签字资料图片生成失败')),'image/png'))
}
