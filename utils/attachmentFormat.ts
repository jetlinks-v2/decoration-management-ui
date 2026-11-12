/** 私有文件服务可能返回通用二进制；优先读取文件头，Office容器再用真实文件名区分。 */
export async function attachmentFormat(blob:Blob,name='') {
  const bytes=new Uint8Array(await blob.arrayBuffer()), starts=(...values:number[])=>values.every((value,index)=>bytes[index]===value)
  if(starts(0x25,0x50,0x44,0x46))return {extension:'pdf',type:'application/pdf'}
  if(starts(0x89,0x50,0x4e,0x47))return {extension:'png',type:'image/png'}
  if(starts(0xff,0xd8,0xff))return {extension:'jpg',type:'image/jpeg'}
  const header=new TextDecoder().decode(bytes.subarray(0,16))
  if(header.startsWith('GIF8'))return {extension:'gif',type:'image/gif'}
  if(header.startsWith('BM'))return {extension:'bmp',type:'image/bmp'}
  if(header.startsWith('RIFF')&&header.includes('WEBP'))return {extension:'webp',type:'image/webp'}
  if(starts(0x50,0x4b,0x03,0x04)){
    const entries=new TextDecoder().decode(bytes)
    if(entries.includes('word/'))return {extension:'docx',type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}
    if(entries.includes('xl/'))return {extension:'xlsx',type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}
  }
  const extension=name.split('.').pop()?.toLowerCase()||''
  if(starts(0xd0,0xcf,0x11,0xe0))return {extension:['doc','xls'].includes(extension)?extension:'bin',type:'application/octet-stream'}
  const type=blob.type.split(';')[0]
  return {extension:extension!==name?extension:({'image/png':'png','image/jpeg':'jpg','application/pdf':'pdf'} as Record<string,string>)[type]||'',type}
}
