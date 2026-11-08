export interface ImageMark { x: number; y: number; width: number; height: number; text: string }
/** 坐标归一化到原图，缩放预览不会改变保存图片上的框选位置。 */
export function rectangle(a: {x:number;y:number}, b: {x:number;y:number}): ImageMark | undefined {
 const clamp=(n:number)=>Math.max(0,Math.min(1,n))
 const x=Math.min(clamp(a.x),clamp(b.x)),y=Math.min(clamp(a.y),clamp(b.y))
 const width=Math.abs(clamp(a.x)-clamp(b.x)),height=Math.abs(clamp(a.y)-clamp(b.y))
 return width<0.005||height<0.005?undefined:{x,y,width,height,text:''}
}
export function drawMarks(ctx: CanvasRenderingContext2D, marks: ImageMark[], width: number, height: number) {
 const line=Math.max(2,width/400),font=Math.max(14,width/60)
 ctx.lineWidth=line;ctx.strokeStyle='#d32029';ctx.font=`${font}px sans-serif`;ctx.textBaseline='top'
 marks.forEach((m,i)=>{
  ctx.strokeRect(m.x*width,m.y*height,m.width*width,m.height*height)
  const text=`${i+1}. ${m.text}`; const box=Math.min(width,ctx.measureText(text).width+12)
  const y=Math.min(height-font-8,(m.y+m.height)*height)
  ctx.fillStyle='#fff';ctx.fillRect(m.x*width,y,box,font+8)
  ctx.fillStyle='#a8071a';ctx.fillText(text,m.x*width+4,y+4,width-m.x*width-8)
 })
}
