import type { Action, Application, Capabilities, Configuration, ConfigurationImportResult, Employee, Role, FormConfiguration, History, Household, Method, Page, Project, Query, Receipt, Task, Transport, CreateApplication, SelfInspection, OverviewReport, DashboardReport, PermitDocument } from '../types/decoration'
import type { InspectionRecord, AcceptanceRecord, ApplicationReviewRow, OwnerHouse, OwnerApplicationSummary, DecorationNotice } from '../types/decoration'
/** PC/H5 共用真实接口契约，传输只负责认证和解包，业务代码不依赖宿主存储。 */
export function createDecorationApi(transport: Transport, mine: boolean) {
  const base = mine ? '/decoration/mobile/applications' : '/decoration/applications'
  const encode = encodeURIComponent
  const call = <T>(path: string, method: Method = 'GET', body?: unknown, signal?: AbortSignal) => transport<T>(path, method, body, signal)
  return {
    mine,
    ownerHouses: () => call<OwnerHouse[]>('/decoration/mobile/applications/_houses'),
    ownerApplications: (query: Query) => call<Page<OwnerApplicationSummary>>('/decoration/mobile/applications/_summaries', 'POST', query),
    ownerNotifications: (query:Query) => call<Page<DecorationNotice>>('/decoration/mobile/applications/_notifications/_query','POST',query),
    projects: () => call<Project[]>('/decoration/directory/projects'),
    households: (project: string) => call<Household[]>(`/decoration/directory/${mine ? 'mine/' : ''}households/${encode(project)}`),
    employees: (projectId: string, query: Query = {}, signal?: AbortSignal) => call<Page<Employee>>(`/decoration/directory/employees/_query?projectId=${encode(projectId)}`, 'POST', query, signal),
    roles: (query: Query = {}) => call<Page<Role>>('/decoration/directory/roles/_query', 'POST', query),
    chargeItems: (project:string,query:Query) => call<Page<{id:string;name:string}>>(`/decoration/directory/charge-items/${encode(project)}/_query`,'POST',query),
    capabilities: () => call<Capabilities>('/decoration/directory/capabilities'),
    form: (project: string, spaceId: string, customerId: string, decorationType: string) => call<FormConfiguration>(`/decoration/directory/form/${encode(project)}?${new URLSearchParams({spaceId, customerId, decorationType, mine: String(mine)})}`),
    query: (query: Query, signal?: AbortSignal) => call<Page<Application>>(`${base}/_query`, 'POST', query, signal),
    reviewList: (query: Query, signal?: AbortSignal) => call<Page<ApplicationReviewRow>>('/decoration/applications/_query?view=review', 'POST', query, signal),
    creationResult: (requestId: string) => call<Application>(`${base}/_requests/${encode(requestId)}`),
    actionResult: (id: string, requestId: string) => call<Application>(`${base}/${encode(id)}/_requests/${encode(requestId)}`),
    dashboard: (query: Query) => call<DashboardReport>('/decoration/applications/_dashboard', 'POST', query),
    statistics: (query: Query) => call<OverviewReport>('/decoration/applications/_statistics', 'POST', query),
    export: (query: Query) => transport<Blob>('/decoration/applications/_export', 'POST', query, undefined, 'blob'),
    permitDocument: (id: string) => call<PermitDocument>(`/decoration/applications/${encode(id)}/permit/document`),
    read: (id: string) => call<Application>(`${base}/${encode(id)}`),
    create: (input: CreateApplication) => call<Application>(base, 'POST', input),
    history: (id: string) => call<History[]>(`${base}/${encode(id)}/history`),
    tasks: (id: string, query: Query = {}) => call<Page<Task>>(`${base}/${encode(id)}/tasks/_query`, 'POST', query),
    action: (id: string, action: string, input: Action) => call<Application>(`${base}/${encode(id)}/${action}`, 'POST', input),
    taskAction: (id: string, action: string, input: Action) => call<Application>(`/decoration/tasks/${encode(id)}/${action}`, 'POST', input),
    myTasks: (query: Query, signal?: AbortSignal) => call<Page<Task>>('/decoration/tasks/mine/_query', 'POST', query, signal),
    queryTasks: (query: Query, signal?: AbortSignal) => call<Page<Task>>('/decoration/tasks/_query', 'POST', query, signal),
    inspectionRecords: (query: Query, signal?: AbortSignal) => call<Page<InspectionRecord>>('/decoration/tasks/inspection/_query', 'POST', query, signal),
    acceptanceRecords: (kind: AcceptanceRecord['kind'], query: Query, signal?: AbortSignal) => call<Page<AcceptanceRecord>>(`/decoration/tasks/acceptance/${kind}/_query?includeEligible=true`, 'POST', query, signal),
    selfInspections: (query: Query) => call<Page<SelfInspection>>('/decoration/self-inspections/_query', 'POST', query),
    selfInspection: (id: string) => call<SelfInspection>(`/decoration/self-inspections/${encode(id)}`),
    deleteSelfInspection: (row: SelfInspection) => call<void>(`/decoration/self-inspections/${encode(row.id)}?version=${row.version}`, 'DELETE'),
    configurations: (query: Query) => call<Page<Configuration>>('/decoration/configurations/_query', 'POST', query),
    saveConfiguration: (input: Configuration) => call<Configuration>('/decoration/configurations', 'POST', input),
    checkImportTemplate: () => transport<Blob>('/decoration/configurations/checks/import-template', 'GET', undefined, undefined, 'blob'),
    importChecks: (file: File, requestId: string) => {
      const data = new FormData(); data.append('file', file)
      return call<ConfigurationImportResult>(`/decoration/configurations/checks/import?${new URLSearchParams({requestId})}`, 'POST', data)
    },
    checkImportResult: (requestId: string) => call<ConfigurationImportResult>(`/decoration/configurations/checks/import-result/${encode(requestId)}`),
    deleteConfiguration: (input: Configuration) => call<void>(`/decoration/configurations/${encode(input.id!)}?version=${input.version}`, 'DELETE'),
    upload: (file: File, projectId: string, decorationId?: string, purpose = 'draft') => {
      const data = new FormData(); data.append('file', file)
      return call<Receipt>(`/decoration/attachments?${new URLSearchParams({projectId, purpose, ...(decorationId ? {decorationId} : {})})}`, 'POST', data)
    },
    attachmentInfo: (id: string) => call<Receipt>(`/decoration/attachments/${encode(id)}/metadata`),
    wordText: (id: string) => call<string>(`/decoration/attachments/${encode(id)}/word-text`),
    download: (id: string) => transport<Blob>(`/decoration/attachments/${encode(id)}`, 'GET', undefined, undefined, 'blob')
  }
}
export type DecorationApi = ReturnType<typeof createDecorationApi>
