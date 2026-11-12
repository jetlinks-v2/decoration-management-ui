import type {SignedDocument,SignedDocumentInput} from '../utils/signedDocuments'
import type {ImageMark} from '../utils/imageAnnotations'
export interface Query { pageIndex?: number; pageSize?: number; terms?: Term[]; sorts?: { name: string; order: string }[] }
export interface Term { column?: string; termType?: string; value?: unknown; type?: string; terms?: Term[] }
export interface Page<T> { data: T[]; total: number; pageIndex: number; pageSize: number }
export interface Project { id: string; name: string; organizationType?: { value: string; text: string } | string | null; children?: Project[] }
export interface Household { projectId: string; spaceId: string; spaceName: string; houseType: string; customerId: string; userId: string; customerName: string; telephone: string; relationshipId: string; nature: string }
export interface OwnerHouse { household: Household; projectName: string; applicationCount: number; processing: boolean }
export interface OwnerApplicationSummary { id: string; projectId: string; spaceId: string; number: string; spaceName: string; status: Status; refundStatus: number; createTime: number; actualEndTime?: number; decorationType?: string }
/** 已提交业务节点的通知快照，不从当前申请状态虚构历史。 */
export interface DecorationNotice { id:string; decorationId:string; number:string; spaceName:string; title:string; message:string; step:import('../utils/applicationWorkflow').OwnerStep; detailUrl:string; createTime:number }
export interface MaterialDefinition { id: string; name: string; kind: 'material' | 'drawing'; source: 'upload' | 'sign'; templateFileId?: string; required: boolean; enabled: boolean; sort: number }
export interface Material { definition: MaterialDefinition; fileIds: string[]; reviewStatus: number; reviewerId?: string; reviewerName?: string; reviewTime?: number; remark?: string; annotatedFileId?: string; annotationSourceFileId?: string; annotations?: ImageMark[] }
/** 审核表格不携带详情快照；打开详情后再读取完整申请。 */
export type ApplicationReviewRow = Pick<Application, 'id'|'projectId'|'number'|'projectName'|'spaceName'|'ownerName'|'contactPhone'|'constructionUnit'|'constructionManager'|'managerPhone'|'houseType'|'decorationType'|'createTime'|'startTime'|'completionTime'|'status'|'creatorName'|'depositReviewStatus'|'refundStatus'> & {
  materialReview: 'notRequired'|'pending'|'approved'|'rejected'
  drawingReview: 'notRequired'|'pending'|'approved'|'rejected'
}
export interface CheckItem { id: string; category: string; categorySort?: number; name: string; inputType: 'text' | 'number' | 'option' | 'image'; required: boolean; enabled: boolean; standard?: string; min?: number; max?: number; options: string[]; example?: string; exampleFileId?: string; sort: number }
export interface CheckResult { itemId: string; value?: string; fileIds: string[]; qualified: boolean; rectification?: string; deadline?: number }
export interface Agreement { title: string; content: string; chargeItemId: string; chargeItemName: string; deposit: number; refundAmount?: number; firstRefund?: number; secondRefund?: number; fees: Record<string, number>; supplements: { name: string; content: string }[] }
export interface ConfigurationContent { agreement?: Agreement; materials: MaterialDefinition[]; checks: CheckItem[]; validityMonths?: number }
export type ConfigurationKind = 'agreement' | 'materials' | 'checks' | 'validity'
export interface Configuration { id?: string; projectId: string; kind: ConfigurationKind; houseType: string; decorationType: string; scene: string; enabled: boolean; version: number; content: ConfigurationContent }
export interface ConfigurationImportProblem { rowNumber: number; columnName: string; cellValue: string; code: string }
export interface ConfigurationImportResult { totalCount: number; validCount: number; importedCount: number; errors: ConfigurationImportProblem[]; configurations: {id: string; projectId: string; version: number}[]; attachmentIds: string[] }
export interface ConfigurationImportView { open: boolean; fileName: string; busy: boolean; uploading: boolean; checking: boolean; downloading: boolean; uncertain: boolean; resultMissing: boolean; error: string; result?: ConfigurationImportResult }
export interface RefundStage { stage: string; amount: number; reference?: string; settledTime: number }
export interface SelfInspectionItem { key:string; value:boolean }
export interface ApplicationDetails { workerRegistration?: WorkerRegistration; selfInspectionReview?: Material; selfInspectionItems?: SelfInspectionItem[]; signedDocuments?: SignedDocument[]; firstAcceptancePassedTime?: number; refunds?: RefundStage[]; ownerCertificate?: string; constructionUnit: string; constructionManager: string; managerPhone: string; managerCertificate?: string; constructionType: number; decorationType: string; houseType: string; startTime: number; completionTime: number; selfInspectionStatus?: 0 | 1; selfInspectionRemark?: string; selfInspectionFiles: string[]; noticesAccepted: boolean; signatureFiles: string[]; materials: Material[]; agreement: Agreement }
export interface WorkerRegistration { safetyPerson: string; safetyPhone: string; content: string; entrusted: boolean; workers: Worker[]; operatorName?: string; time?: number }
export interface Worker { name: string; certificate: string; phone: string; entryTime: number; expirationTime: number }
export interface PermitPrint { outputType?: 'print'|'download'; snapshotFileId: string; sealDigest: string; endTime: number; operatorId: string; operatorName: string; time: number }
export interface PermitCollection { snapshotFileId: string; endTime: number; collectedBy: string; collectedTime: number; operatorId: string; operatorName: string }
export interface Permit { number: string; safetyPerson: string; safetyPhone: string; content: string; entrusted: boolean; workers: Worker[]; startTime: number; endTime: number; validityMonths: number; printTime?: number; downloadTime?: number; legacyPrintTime?: number; prints?: PermitPrint[]; collections?: PermitCollection[]; collectedTime?: number; collectedBy?: string; collectionOperatorName?: string; collectionSnapshotFileId?: string; approverName: string; approverPhone?: string; extensions: { beforeEndTime: number; afterEndTime: number; months: number; actorName: string; time: number }[] }
export interface PermitDocument { application: Application; sealDataUrl?: string; sealDigest: string; snapshotFileId?: string }
export interface PermitPrintAction { outputType?: 'print'|'download'; sealDigest: string; snapshotFileId: string }
export type Status = 'reviewing' | 'rejected' | 'pending_payment' | 'pending_permit' | 'permit_issued' | 'first_acceptance_waiting' | 'first_acceptance_in_progress' | 'first_acceptance_failed' | 'pending_second_acceptance' | 'second_acceptance_waiting' | 'second_acceptance_in_progress' | 'second_acceptance_failed' | 'acceptance_passed' | 'finished'
export interface Application { inspectionPlan?:TaskDetails; nextInspectionTime?:number; constructionUnit?: string; constructionManager?: string; managerPhone?: string; houseType?: string; decorationType?: string; startTime?: number; completionTime?: number; id: string; applicationId: string; tenantId: string; projectId: string; projectName: string; spaceId: string; spaceName: string; customerId: string; ownerUserId: string; ownerName: string; contactPhone: string; number: string; source: 'pc_admin' | 'h5_owner'; creatorId: string; creatorName: string; status: Status; version: number; createTime: number; modifyTime: number; actualEndTime?: number; endReason?: string; depositReviewStatus: number; approvedDeposit?: number; depositReviewerName?: string; depositReviewTime?: number; depositReviewRemark?: string; paymentStatus: number; paymentReference?: string; paidAmount?: number; paidTime?: number; refundStatus: number; refundReference?: string; refundedAmount?: number; refundTime?: number; acceptanceRound: number; acceptanceType: number; acceptanceDate?: number; acceptanceRequestTime?: number; acceptanceRequesterId?: string; acceptanceRequesterName?: string; acceptanceSource?: 'pc_admin' | 'h5_owner'; details: ApplicationDetails; permit?: Permit }
export interface Violation { location: string; rectification: string; fileIds: string[] }
export interface InspectionRole { roleId:string; roleName?:string; intervalDays:number }
export interface TaskHandlingRecord { action: 'auditViolation'|'submitRectification'|'reviewRectification'|'reassignReviewRole'|'resendRectification'; status:string; operatorId:string; operatorName:string; time:number; remark?:string; fileIds:string[]; reviewRoleId?:string; reviewRoleName?:string }
export interface TaskDetails { checks: CheckItem[]; results: CheckResult[]; fileIds: string[]; feedback?: string; deadline?: number; inspectionRoles: InspectionRole[]; scheduledDate?:string; startTime?: number; endTime?: number; auditRoleId?: string; auditRoleName?: string; reviewRoleId?: string; reviewRoleName?: string; violations: Violation[]; rectificationFiles: string[]; rectificationRemark?: string; handlingRecords?:TaskHandlingRecord[] }
/** 任务资格由服务端按当前读取人计算，并与页面菜单权限取交集。 */
export interface Task { feedbackAllowed?:boolean; reviewAllowed?:boolean; decorationStatus?:Status; id: string; number?:string; projectName?:string; spaceName?:string; ownerName?:string; contactPhone?:string; constructionUnit?:string; constructionManager?:string; managerPhone?:string; houseType?:string; decorationType?:string; applicationTime?:number; decorationStartTime?:number; completionTime?:number; creatorId?:string; creatorName?:string; acceptanceDate?:number; acceptanceRequestTime?:number; acceptanceRequesterId?:string; acceptanceRequesterName?:string; acceptanceSource?:'pc_admin'|'h5_owner'; sourceTaskId?:string; decorationId: string; kind: 'daily' | 'inspectionRecord' | 'firstAcceptance' | 'secondAcceptance'; round: number; assigneeId?: string; assigneeName?: string; parentId?: string; status: string; version: number; createTime: number; modifyTime: number; details: TaskDetails }
/** 验收记录按装修、验收类型汇总；任务及历次反馈在详情中分页读取。 */
export type AcceptanceRecord = Pick<Task, 'decorationStatus'|'id'|'decorationId'|'projectName'|'number'|'spaceName'|'ownerName'|'contactPhone'|'constructionUnit'|'constructionManager'|'managerPhone'|'houseType'|'decorationType'|'assigneeName'|'acceptanceDate'|'acceptanceRequestTime'|'acceptanceRequesterName'|'acceptanceSource'|'modifyTime'> & {kind:'firstAcceptance'|'secondAcceptance';status:'not_requested'|'waiting_assignment'|'pending'|'passed'|'failed';requestAllowed:boolean;round?:number;createTime?:number}
export interface History { id: string; action: string; actorName: string; beforeStatus?: string; afterStatus: string; remark?: string; version: number; createTime: number; snapshot: Application }
export interface Employee { id: string; name: string; telephone?: string }
export interface Receipt { id: string; name: string; size: number; contentType: string }
export interface MaterialUpload { itemId: string; fileIds: string[] }
export interface CreateApplication { selfInspectionItems?: SelfInspectionItem[]; signedDocuments?: SignedDocumentInput[]; requestId: string; projectId: string; spaceId: string; customerId: string; contactPhone: string; ownerCertificate?: string; constructionUnit: string; constructionManager: string; managerPhone: string; managerCertificate?: string; constructionType: number; decorationType: string; startTime?: number; completionTime?: number; noticesAccepted: boolean; selfInspectionStatus?: 0 | 1; selfInspectionRemark?: string; selfInspectionFiles: string[]; signatureFiles: string[]; materials: MaterialUpload[] }
export interface FormConfiguration { household: Household; agreement: Agreement; materials: MaterialDefinition[] }
export interface Action { requestId: string; version: number; remark?: string; itemId?: string; result?: number; annotatedFileId?: string; annotationSourceFileId?: string; annotations?: ImageMark[]; amount?: number; materials?: MaterialUpload[]; completionTime?: number; actualEndTime?: number; safetyPerson?: string; safetyPhone?: string; content?: string; entrusted?: boolean; workers?: Worker[]; months?: number; type?: number; acceptanceDate?: number; assigneeIds?: string[]; taskId?: string; passed?: boolean; results?: CheckResult[]; fileIds?: string[]; deadline?: number; violations?: Violation[]; inspectionRoles?: InspectionRole[]; reviewRoleId?: string; startTime?: number; endTime?: number; reference?: string }
export interface Role { id: string; name: string }
export interface Capabilities { simulated?: boolean; payment: boolean; refund: boolean; pushNotification: boolean }
export type Method = 'GET' | 'POST' | 'DELETE'
export type Transport = <T>(path: string, method: Method, body?: unknown, signal?: AbortSignal, responseType?: 'blob') => Promise<T>
export interface SessionContext { userId: string; applicationId: string; sessionEntryCode: string; tenantId?: string; businessProjectId?: string }

/** 业主提交时的独立自检快照，附件归属保持为原申请。 */
export interface SelfInspection { decorationStatus?:Status; id: string; decorationId: string; projectId: string; projectName: string; spaceId: string; spaceName: string; number: string; creatorName: string; createTime: number; status: 0 | 1; remark?: string; fileIds: string[]; version: number }
export interface OverviewItem { name: string; value: number }
export interface OverviewSummary { totalHouseCount: number; totalHouseCountRate: number; inDecorationHouseCount: number; inDecorationHouseCountRate: number; completedHouseCount: number; completedHouseCountRate: number; paidDepositAmount: number; paidDepositAmountRate: number }
export interface OverviewReport { summary: OverviewSummary; funnel: OverviewItem[]; houseTypePie: OverviewItem[] }

export interface DashboardMetric { key: string; group: string; value: number }
export interface DashboardMonth { month: string; created: number; ended: number }
export interface DashboardReport { asOf: number; metrics: DashboardMetric[]; trend: DashboardMonth[] }

/** 一次周期巡检的列表投影，任务、反馈和整改明细按需从详情读取。 */
export interface InspectionRecord { id:string; decorationId:string; projectId:string; number?:string; projectName?:string; spaceName?:string; decorationStatus?:Status; assigneeName?:string; status:string; inspectionResult:"pending"|"normal"|"violation"; scheduledDate?:string; createTime:number; modifyTime:number; feedbackAllowed:boolean }
