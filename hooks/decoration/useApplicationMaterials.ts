import {computed} from 'vue'
import type {CreateApplication,FormConfiguration} from '../../types/decoration'

/** 申请仅展示当前适用配置中的启用项，资料与图纸分组并保留配置排序。 */
export function useApplicationMaterials(form:CreateApplication,configuration:()=>FormConfiguration,kind:()=>string|undefined){
 const sections=computed(()=>['material','drawing'].filter(value=>!kind()||kind()===value).map(value=>({kind:value,title:value==='material'?'装修资料':'装修图纸',items:configuration().materials.filter(item=>item.enabled&&item.kind===value).sort((a,b)=>a.sort-b.sort)})))
 function setFiles(id:string,ids:string[]){const material=form.materials.find(item=>item.itemId===id);if(material)material.fileIds=ids}
 return {sections,setFiles}
}
