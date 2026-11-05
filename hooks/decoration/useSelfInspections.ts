import {computed, onMounted, onScopeDispose, ref} from 'vue'
import {usePermission} from '@jetlinks-web/hooks'
import {decorationApi as api} from '../../api/decoration'
import {projectTree, projectTerms, errorText} from '../../utils/decoration'
import type {ConditionTerm, ConditionFilterChangePayload} from '@jetlinks-web-core/components/ConditionFilter/types'
import type {SelfInspection} from '../../types/decoration'

/** 独立自检记录；列表与详情各自丢弃过期响应，切换项目不保留旧上下文。 */
export function useSelfInspections() {
  const projectId=ref(''), tree=ref<ReturnType<typeof projectTree>>([]), terms=ref<ConditionTerm[]>([])
  const appliedTerms=ref<ConditionTerm[]>([])
  const rows=ref<SelfInspection[]>([]), total=ref(0), page=ref(1), loading=ref(false), saving=ref(false), error=ref('')
  const detail=ref<SelfInspection>(), detailOpen=ref(false), detailLoading=ref(false), detailError=ref('')
  const canDelete=usePermission('decoration/SelfInspection:delete').hasPerm
  const query=computed(()=>({pageIndex:page.value-1,pageSize:20,terms:projectTerms(appliedTerms.value,projectId.value)}))
  let generation=0, detailGeneration=0, disposed=false
  onScopeDispose(()=>{disposed=true;generation++;detailGeneration++})
  async function load() {
    const token=++generation;loading.value=true;error.value=''
    try {
      const result=await api.selfInspections(query.value)
      if(disposed||token!==generation)return
      rows.value=result.data;total.value=result.total
      if(page.value>1&&!result.data.length){page.value=Math.max(1,Math.ceil(result.total/20));await load()}
    }catch(e){if(!disposed&&token===generation)error.value=errorText(e)}
    finally{if(token===generation)loading.value=false}
  }
  async function loadProjects(){try{const projects=await api.projects();if(!disposed)tree.value=projectTree(projects)}catch(e){if(!disposed)error.value=errorText(e)}}
  function closeDetail(){detailGeneration++;detailOpen.value=false;detail.value=undefined;detailLoading.value=false;detailError.value=''}
  async function openDetail(id:string){
    const token=++detailGeneration;detail.value=undefined;detailOpen.value=true;detailLoading.value=true;detailError.value=''
    try{const result=await api.selfInspection(id);if(!disposed&&token===detailGeneration)detail.value=result}
    catch(e){if(!disposed&&token===detailGeneration)detailError.value=errorText(e)}
    finally{if(token===detailGeneration)detailLoading.value=false}
  }
  function changeProject(value?:string){if(saving.value)return;closeDetail();rows.value=[];total.value=0;projectId.value=value||'';page.value=1;void load()}
  // modelValue 是编辑草稿；change.filter 是组件完成校验、like通配和日期转换后的正式查询。
  function changeFilters(value:ConditionFilterChangePayload){appliedTerms.value=value.filter.terms;rows.value=[];page.value=1;void load()}
  function changePage(value:number){page.value=value;void load()}
  async function remove(row:SelfInspection){
    if(saving.value)return
    saving.value=true;error.value=''
    try{await api.deleteSelfInspection(row);if(detail.value?.id===row.id)closeDetail();await load()}
    catch(e){error.value=errorText(e)}finally{saving.value=false}
  }
  onMounted(async()=>{await load();await loadProjects()})
  return {api,projectId,tree,terms,rows,total,page,loading,saving,error,detail,detailOpen,detailLoading,detailError,canDelete,load,loadProjects,openDetail,closeDetail,changeProject,changeFilters,changePage,remove}
}
