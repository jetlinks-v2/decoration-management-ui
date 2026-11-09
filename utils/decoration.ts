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
  const fixed: Term[] = mode === 'inspection' ? [{column:'permit',termType:'notnull'}] : mode === 'first' ? [{column:'acceptanceType',termType:'eq',value:1}]
    : mode === 'second' ? [{column:'acceptanceType',termType:'eq',value:2}]
    // 管理端审核通过后须能进入备案页核验线下收款；发证动作仍由服务端校验真实收款。
    : mode === 'permits' ? [{type:'and',terms:[{column:'paymentStatus',termType:'eq',value:2},{type:'or',terms:[{column:'source',termType:'eq',value:'pc_admin'},{column:'status',termType:'eq',value:'pending_payment'}]}]}] : []
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
/** 旧已发证数据只有printTime，保留资格但不伪造领取信息；新证件以独立领取记录为准。 */
export function permitReceived(permit?: Permit): boolean {
  return !!permit && (permit.collectedTime != null || permit.printTime != null && !permit.prints?.length)
}
/** 与服务端备案筛选一致：新打印不等于领取，过期优先于延期。 */
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
  if (kind !== 'inspectionRecord') return ['pending', 'passed', 'failed']
  return [...(allRecords ? ['passed'] : []), 'owner_rectification', 'waiting_review', 'rectification_rejected', 'rectified', 'reissued']
}
export function canRequestAcceptance(row: Application, type: number) {
  return !row.actualEndTime && permitReceived(row.permit) && (type === 1 ? row.acceptanceType === 0 || row.status === 'first_acceptance_failed' : ['pending_second_acceptance','second_acceptance_failed'].includes(row.status))
}
/** 旧记录页按备案许可区间判断生效，不以装修结束或打印状态替代。 */
export function permitIsActive(permit?: Permit, now = Date.now()) {
  return permit?.startTime != null && permit.endTime != null && now > permit.startTime && now < permit.endTime
}
/** 实际结束时间可在结束后纠正；其他流程仍遵守结束和外部能力门槛。 */
export function applicationActionNames(row: Application | undefined, mine: boolean, permissions: Record<string, boolean>, capabilities: Capabilities) {
  if (!row) return []
  const allowed = (key: string) => mine || !!permissions[key]
  const names: string[] = []
  if (!mine && allowed('save')) names.push('actual-end-time')
  if (row.actualEndTime != null) return names
  if ((canRequestAcceptance(row, 1) || canRequestAcceptance(row, 2)) && allowed('acceptance')) names.push('acceptance')
  if (!mine) {
    if (row.paymentStatus === 2 && !row.permit && allowed('permit')) names.push('permit')
    if (row.permit) {
      if (allowed('extend')) names.push('permit/extend')
      if (allowed('print')) {
        names.push('permit/print')
        const latest = row.permit.prints?.at(-1)
        if (latest && latest.endTime === row.permit.endTime && row.permit.collectedTime == null) names.push('permit/collect')
      }
      if (allowed('assign')) names.push('inspection/assign')
    }
    if (['first_acceptance_waiting', 'second_acceptance_waiting'].includes(row.status) && allowed('assign')) names.push('acceptance/assign')
    if (allowed('save')) names.push('completion-time')
    if (allowed('end')) names.push('end')
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
