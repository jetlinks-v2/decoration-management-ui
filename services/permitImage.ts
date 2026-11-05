/** 仅截取独立证件，不依赖详情当前页签或宿主打印样式。图片失败必须先于登记打印。 */
export async function capturePermitImage(element: HTMLElement): Promise<Blob> {
 for(const image of Array.from(element.querySelectorAll('img'))) {
  await image.decode()
  if(!image.naturalWidth)throw new Error('Decoration.permitDocument.imageFailed')
 }
 await document.fonts?.ready
 const {default:html2canvas}=await import('html2canvas')
 const canvas=await html2canvas(element,{scale:2,backgroundColor:'#fff',logging:false})
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Decoration.permitDocument.captureFailed')),'image/png'))
}

/** 私有证件仅在临时同源iframe中打印，浏览器打印事件或有限超时后释放；不打印宿主页。 */
export async function printPermitImage(blob: Blob): Promise<()=>void> {
 const frame=document.createElement('iframe'),url=URL.createObjectURL(blob)
 frame.title='装修开工证打印';frame.style.cssText='position:fixed;width:0;height:0;border:0;bottom:0;right:0'
 document.body.append(frame)
 let timer:ReturnType<typeof setTimeout>|undefined
 const cleanup=()=>{if(timer)clearTimeout(timer);frame.remove();URL.revokeObjectURL(url)}
 try {
  const page=frame.contentDocument,view=frame.contentWindow
  if(!page||!view)throw new Error('Decoration.permitDocument.printFailed')
  const style=page.createElement('style');style.textContent='@page{size:A4 landscape;margin:8mm}html,body{margin:0}img{display:block;width:100%;height:auto;max-height:190mm;object-fit:contain}'
  page.head.append(style)
  const image=page.createElement('img');image.alt='装修开工证';image.src=url;page.body.append(image)
  await image.decode()
  view.addEventListener('afterprint',cleanup,{once:true});timer=setTimeout(cleanup,120000)
  view.focus();view.print()
  return cleanup
 } catch(error) {cleanup();throw error}
}
