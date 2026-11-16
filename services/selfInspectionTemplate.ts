import type {Configuration,SelfInspectionDefinition} from '../types/decoration'
import type {DecorationApi} from './decorationApi'
import {selfInspectionGroupsFor,type SelfInspectionSnapshot} from '../utils/selfInspection'
import {selfInspectionImage} from '../utils/selfInspectionImage'

/** 按完整表格行分页，为纸质签字和日期预留空间；分类跨页时重复分类标题。 */
export function selfInspectionTemplatePages(definitions:SelfInspectionDefinition[]):SelfInspectionSnapshot[]{
 const snapshot:SelfInspectionSnapshot={metadata:['房屋：','业主：','联系电话：'],status:0,groups:selfInspectionGroupsFor(definitions).map(group=>({...group,items:group.items.map(item=>({...item,value:undefined}))}))}
 if(!snapshot.groups.length)throw new Error('当前配置没有启用的自检项，请先完善装修自检配置')
 const pages:SelfInspectionSnapshot[]=[],height=720
 let groups:SelfInspectionSnapshot['groups']=[],remaining=height
 function nextPage(){pages.push({...snapshot,groups});groups=[];remaining=height}
 for(const group of snapshot.groups){
  let index=0
  while(index<group.items.length){
   const capacity=Math.floor((remaining-28)/60)-1
   if(capacity<1){nextPage();continue}
   const items=group.items.slice(index,index+capacity)
   groups.push({...group,items});remaining-=(items.length+1)*60+28;index+=items.length
  }
 }
 if(groups.length)nextPage()
 return pages
}

/** 保存资料配置时生成空白PDF，房屋、业主及签字信息留待线下填写。 */
export async function selfInspectionTemplate(definitions:SelfInspectionDefinition[]):Promise<Blob>{
 const pages=selfInspectionTemplatePages(definitions)
 const {jsPDF}=await import('jspdf')
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
 for(let index=0;index<pages.length;index++){
  if(index)pdf.addPage()
  const image=await selfInspectionImage(pages[index])
  pdf.addImage(new Uint8Array(await image.arrayBuffer()),'PNG',10,10,190,264.1,undefined,'FAST')
 }
 return pdf.output('blob')
}

/** 只有PDF生成并上传成功后，才更新本次配置待保存的模板文件引用。 */
export async function prepareSelfInspectionTemplate(api:Pick<DecorationApi,'upload'>,configuration:Configuration){
 const blob=await selfInspectionTemplate(configuration.content.selfInspections)
 const receipt=await api.upload(new File([blob],'装修自检表.pdf',{type:'application/pdf'}),configuration.projectId,undefined,'template')
 configuration.content.selfInspectionTemplateFileId=receipt.id
}
