import type { Project, Application, Status, Term, Material, Task, Permit, Capabilities, Agreement } from '../types/decoration'
export function requestId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` }
export interface ProjectTreeNode {
  value: string
  title: string
  selectable: boolean
  disabled: boolean
  children: ProjectTreeNode[]
}
/** 保留提供方返回的组织层级；项目可有子级，不以叶子或名称推断项目类型。 */
export function projectTree(nodes: Project[]): ProjectTreeNode[] {
  return nodes.map(node => { const project = (typeof node.organizationType === 'string' ? node.organizationType : node.organizationType?.value) === 'project'
    return {value: node.id, title: node.name, selectable: project, disabled: !project, children: projectTree(node.children || [])} })
}
/** 与巡更相同：控件事件也校验当前树，拒绝非项目及树外节点。 */
export function isSelectableProject(nodes: ProjectTreeNode[], value: string): boolean {
  for (const node of nodes) {
    if (node.value === value) return node.selectable && !node.disabled
    if (isSelectableProject(node.children, value)) return true
  }
  return false
}
export const statusKeys: Status[] = ['reviewing','rejected','pending_payment','pending_permit','permit_issued','first_acceptance_waiting','first_acceptance_in_progress','first_acceptance_failed','pending_second_acceptance','second_acceptance_waiting','second_acceptance_in_progress','second_acceptance_failed','acceptance_passed','finished']
/** PC与小程序共用结束标志：二验通过且退款成功，不能只凭结束时间或单个财务标志判断。 */
export const isCompletedWorkflow=(row?:Pick<Application,'status'|'refundStatus'>)=>row?.refundStatus===2&&['acceptance_passed','finished'].includes(row.status)
/** 已持久化的手动结束记录不能显示为办理完成，仍保留原记录供物业核查。 */
export function workflowStatus(row:Pick<Application,'status'|'refundStatus'>){
  return isCompletedWorkflow(row)?'finished':row.status==='finished'?'refund_incomplete':row.status
}
/** 使用服务端流程状态切换入口；仅打开缴费步骤，不在打开页面时自动收款。 */
export function reviewListAction(row: Pick<Application, 'status'>) {
  if (row.status === 'pending_payment') return {label: '缴费', tab: 'finance' as const}
  if (row.status === 'reviewing' || row.status === 'rejected') return {label: '审核', tab: 'materials' as const}
  return {label: '详情', tab: 'overview' as const}
}
/** 与服务端审核门槛一致：未上传的选填项不阻塞，任一驳回优先显示。 */
export function materialReviewState(materials: Material[], kind: Material['definition']['kind']) {
  const items = materials.filter(item => item.definition.kind === kind)
  if (items.some(item => item.reviewStatus === 2)) return 'rejected'
  const requiredReviews = items.filter(item => item.definition.required || item.fileIds.length > 0)
  if (!requiredReviews.length) return 'notRequired'
  return requiredReviews.every(item => item.reviewStatus === 1) ? 'approved' : 'pending'
}
export function projectTerms(terms: Term[], projectId?: string): Term[] {
  return [{ type: 'and', terms }, ...(projectId ? [{column:'projectId',termType:'eq',value:projectId}] : [])]
}
/** 页面对象范围独立于用户表达式；审核页保留已完成记录供只读追溯。 */
export function applicationQueryTerms(mode: string, terms: Term[], projectId?: string): Term[] {
  const received:Term={column:'permit',termType:'decoration-permit-state',value:['issued','extended','expired']}
  const fixed: Term[] = mode === 'inspection' || mode==='first' ? [received]
    : mode === 'second' ? [received,{type:'and',terms:[
      {column:'details',termType:'json_value',value:{path:'firstAcceptancePassedTime',termType:'notnull',value:null}},
      {type:'or',column:'acceptanceType',termType:'eq',value:2},
      {type:'or',column:'status',termType:'in',value:['pending_second_acceptance','second_acceptance_waiting','second_acceptance_in_progress','second_acceptance_failed','acceptance_passed']}
    ]}]
    : mode === 'permits' ? [{column:'paymentStatus',termType:'eq',value:2}] : []
  return [...projectTerms(applicationFilterTerms(terms), projectId), ...fixed]
}
/** 页面字段映射到框架 JSON 查询；保留用户嵌套/OR，交给数据库过滤后分页。 */
export function applicationFilterTerms(terms: Term[]): Term[] {
  return terms.map<Term | undefined>(term => {
    if (term.terms) {const children=applicationFilterTerms(term.terms);return children.length?{...term,terms:children}:undefined}
    // 条件编辑器会发布尚未选择值的草稿；只将完成的条件映射为JSON/业务termType。
    if (term.column === 'permitStatus') return term.value && (!Array.isArray(term.value)||term.value.length)?{...term, column:'permit', termType:`decoration-permit-state${term.termType === 'nin' ? '$not' : ''}`}:undefined
    if (term.column !== 'printTime') return term
    const json = (operator: string, value: unknown): Term => ({column:'permit',termType:'json_value',value:{path:'printTime',termType:operator,value:['isnull','notnull'].includes(operator)?null:Number(value)}})
    if (['btw','nbtw'].includes(term.termType || '')) {
      if (!Array.isArray(term.value)||term.value.length!==2||term.value.some(value=>value==null||value===''||!Number.isFinite(Number(value)))) return undefined
      const negative = term.termType === 'nbtw'
      return {type:term.type,terms:[json(negative?'lt':'gte',term.value[0]),{...json(negative?'gt':'lte',term.value[1]),type:negative?'or':'and'}]}
    }
    if (!['isnull','notnull'].includes(term.termType || '') && (term.value==null||term.value===''||!Number.isFinite(Number(term.value)))) return undefined
    return {...json(term.termType || 'eq',term.value),type:term.type}
  }).filter((term): term is Term => !!term)
}
/** 当前版本打印或下载即完成备案；仅兼容旧领取记录，不生成领取信息。 */
export function permitReceived(permit?: Permit): boolean {
  return !!permit && (permit.collectedTime != null || permit.printTime != null || permit.downloadTime != null)
}
/** 与服务端备案筛选一致：打印或下载后判断有效期，过期优先于延期。 */
export function permitStatus(permit?: Permit, now = Date.now()) {
  if (!permit || !permitReceived(permit)) return 'pending'
  if (permit.endTime != null && now > permit.endTime) return 'expired'
  return permit.extensions?.length ? 'extended' : 'issued'
}
/** 配置类别是页面约束，用户的名称、字典及状态筛选不能将其替换。 */
export function configurationQueryTerms(kind: string, terms: Term[], projectId?: string): Term[] {
  return [...projectTerms(terms, projectId), {column:'kind',termType:'eq',value:kind}]
}
/** 页面固定类型和项目不与用户的 OR 条件混合；完整巡检记录保留正常反馈。 */
export function taskQueryTerms(kind: Task['kind'], terms: Term[], projectId?: string, allRecords = false): Term[] {
  return [...projectTerms(terms, projectId), {column:'kind',termType:'eq',value:kind},
    ...(kind === 'inspectionRecord' && !allRecords ? [{column:'status',termType:'not',value:'passed'}] : [])]
}
export function taskStatusKeys(kind: Task['kind'], allRecords = false) {
  if (kind === 'daily') return ['pending', 'completed']
  if (kind !== 'inspectionRecord') return ['waiting_assignment', 'pending', 'passed', 'failed']
  return [...(allRecords ? ['passed'] : []), 'owner_rectification', 'waiting_review', 'rectification_rejected', 'rectified', 'reissued']
}
export function canRequestAcceptance(row: Application, type: number) {
  return !row.actualEndTime && permitReceived(row.permit) && (type === 1 ? row.acceptanceType === 0 || row.status === 'first_acceptance_failed' : ['pending_second_acceptance','second_acceptance_failed'].includes(row.status))
}
/** 旧记录页按备案许可区间判断生效，不以装修结束或打印状态替代。 */
export function permitIsActive(permit?: Permit, now = Date.now()) {
  return permit?.startTime != null && permit.endTime != null && now > permit.startTime && now < permit.endTime
}
/** 与原装修一致，仅到期前七天内（含过期）开放延期，结束后不再办理。 */
export function canExtendPermit(row: Application, now = Date.now()): boolean {
  return !row.actualEndTime && row.permit?.endTime != null && row.permit.endTime <= now + 7 * 86400000
}
/** 只有退费完成后可纠正结束时间；不提供绕过退费的手动结束入口。 */
export function applicationActionNames(row: Application | undefined, mine: boolean, permissions: Record<string, boolean>, capabilities: Capabilities) {
  if (!row) return []
  const allowed = (key: string) => mine || !!permissions[key]
  const names: string[] = []
  if (!mine && allowed('save') && isCompletedWorkflow(row)) names.push('actual-end-time')
  if (isCompletedWorkflow(row) || row.actualEndTime != null) return names
  if ((mine || row.source === 'pc_admin') && (canRequestAcceptance(row, 1) || canRequestAcceptance(row, 2)) && allowed('acceptance')) names.push('acceptance')
  if (!mine) {
    if (row.paymentStatus === 2 && allowed('permit')) {
      names.push('permit/workers')
      if (!row.permit && row.details.workerRegistration) names.push('permit')
    }
    if (row.permit) {
      if (allowed('extend') && canExtendPermit(row)) names.push('permit/extend')
      if (allowed('print')) {
        names.push('permit/print')
      }
      if (permitReceived(row.permit) && allowed('assign')) names.push('inspection/assign')
    }
    if (['first_acceptance_waiting', 'second_acceptance_waiting'].includes(row.status) && allowed('assign')) names.push('acceptance/assign')
    if (allowed('save')) names.push('completion-time')
  }
  if (row.status === 'pending_payment' && allowed('payment') && capabilities.payment) names.push('payment')
  if (nextRefund(row) && allowed('refund') && capabilities.refund) names.push('refund')
  return names
}
export function errorText(error: unknown): string {
  const value = error as {message?: string; response?: {data?: {message?: string}}}
  return value?.response?.data?.message || value?.message || '请求失败，请重试'
}
export function isUncertain(error: unknown) {
  const value = error as { status?: number; response?: { status?: number }; name?: string }
  return value?.name === 'AbortError' || !value?.response && !value?.status || (value?.status || value?.response?.status || 0) >= 500
}

/** 历史两期金额合并为退款总额；未配置则使用实收金额。 */
export function refundTotal(agreement: Agreement, paidAmount: number): number {
  return agreement.refundAmount ?? (agreement.firstRefund == null && agreement.secondRefund == null
    ? paidAmount : Math.round((Number(agreement.firstRefund || 0) + Number(agreement.secondRefund || 0)) * 100) / 100)
}
/** 二验通过后一次性结算冻结总额，扣除历史已核验退款；零元仍需显式结算。 */
export function nextRefund(row: Application): {stage: string; label: string; amount: number} | undefined {
  if (row.actualEndTime || row.paymentStatus !== 2 || row.refundStatus === 2 || row.status !== 'acceptance_passed') return
  const agreement = row.details.agreement
  const total = refundTotal(agreement, row.paidAmount || 0)
  return {stage:'single',label:'二次验收后一次性退款',amount:Math.round((total - (row.refundedAmount || 0)) * 100) / 100}
}
