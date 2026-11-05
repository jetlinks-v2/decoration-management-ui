# 装修 PC / H5 新旧系统功能与细节对照

本表的旧系统事实来自源码，字段保持源码顺序。提取的 title/label 包含弹窗确认和提示语，不能把它们全部当数据库字段。新系统覆盖状态须以实际代码与验证为准，不以本清单代表已完成。

## PC 入口与字段

### views/decorationManagement/AgreementManagement/AgreementManagement.vue

- 界面字段/筛选/提示：确定要删除吗？；协议编号；所属项目；请输入；装修业态；请选择；收费科目；装修保证金；检查合格退款；操作
- 绑定字段：idCode、projectName、decorationFormat、chargeItemName、decorationDeposit、secondRefund、action

### views/decorationManagement/BaseConfig/CheckConfig/CheckConfig.vue

- 界面字段/筛选/提示：所属项目；请选择所属项目；房屋类型；请选择房屋类型；装修类型；请选择装修类型
- 绑定字段：见页面表单和组件。

### views/decorationManagement/BaseConfig/MaterialConfig/MaterialConfig.vue

- 界面字段/筛选/提示：确定删除该配置吗？；序号；项目名称；请输入项目名称；房屋类型；装修类型；状态；资料项数；图纸项数；操作
- 绑定字段：index、projectName、houseType、decorationType、status、materialItems、drawingItems、action

### views/decorationManagement/DecorationPatrolModule/AssignTask.vue

- 界面字段/筛选/提示：巡检任务编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；业主；业主姓名；联系电话；业主电话；施工单位；施工方负责人；负责人联系电话；业主申请时间；装修开始时间；装修竣工时间；房屋类型；装修类别；装修状态；全部；待领取许可证；装修中；已完工；操作
- 绑定字段：idCode、regionName、projectName、roomNumber、ownerName、contactPhone、constructionUnit、constructionManager、managerPhone、applicationTime、startTime、completionTime、houseType、decorationCategory、status、action

### views/decorationManagement/DecorationPatrolModule/ViolationRecord.vue

- 界面字段/筛选/提示：违章处理编号；项目名称；请输入；房号；支持模糊查询；业主；联系电话；处理状态；全部；待业主整改；整改通过；待审核；已驳回；施工单位；施工方负责人；负责人联系电话；巡检人；提交时间；违章位置；整改复核角色；操作
- 绑定字段：idCode、projectName、roomNumber、ownerName、contactPhone、status、constructionUnit、constructionManager、managerPhone、inspectorName、createTime、violationLocation、rectificationReviewRoleName、action

### views/decorationManagement/DecorationPermit/DecorationPermit.vue

- 界面字段/筛选/提示：备案编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；业主；姓名；联系电话；业主电话；装修开始时间；装修竣工时间；装修备案状态；全部；待领取装修备案证明；已领取装修备案证明；已延期；已过期；装修备案审核人；装修备案审核人电话；打印时间；打印备案证明时间；操作
- 绑定字段：permitNumber、regionName、projectName、roomNumber、ownerName、contactPhone、startTime、completionTime、decorationStatus、approver、approverPhone、printTime、action

### views/decorationManagement/DecorationRecord/DecorationRecord.vue

- 界面字段/筛选/提示：暂无结束原因；装修记录编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；业主；业主姓名；联系电话；业主电话；施工单位；施工方负责人；负责人联系电话；装修开始时间；装修竣工时间；房屋类型；装修类别；备案申报人；备案联系人联系电话；是否委托；是否生效中；业主申请时间；装修结束时间；装修状态；全部；操作
- 绑定字段：idCode、regionName、projectName、roomNumber、ownerName、contactPhone、constructionUnit、constructionManager、managerPhone、startTime、completionTime、houseType、decorationCategory、approver、approverPhone、isEntrusted、isActive、applicationTime、actualEndTime、status、action

### views/decorationManagement/FirstAcceptance/FirstAcceptance.vue

- 界面字段/筛选/提示：首次验收编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；验收结果；全部；待指派；待验收；已通过；未通过；姓名；业主电话；验收时间；审核类型；验收人；提交审核时间；登记人；操作；确认重新发起首次验收？
- 绑定字段：idCode、regionName、projectName、roomNumber、acceptanceResult、ownerName、ownerPhone、applicationDate、auditType、acceptancePersonNames、createTime、createBy、action

### views/decorationManagement/HomeStatistics/HomeStatistics.vue

- 界面字段/筛选/提示：全部项目；累计装修总户数；在装中户数
- 绑定字段：见页面表单和组件。

### views/decorationManagement/InspectionRecord/InspectionRecord.vue

- 界面字段/筛选/提示：巡检记录编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；巡检结果；更新时间；时间；巡查详情；确认发起整改复核？
- 绑定字段：idCode、regionName、projectName、roomNumber、hasViolation、updateTime、action

### views/decorationManagement/OnlineReview/OnlineReview.vue

- 界面字段/筛选/提示：审核编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；业主；业主姓名；联系电话；业主电话；施工单位；施工方负责人；负责人联系电话；业主申请时间；装修开始时间；装修竣工时间；房屋类型；装修类别；资料审核状态；装修图纸审核状态；装修保证金审核状态；登记人；操作
- 绑定字段：idCode、regionName、projectName、roomNumber、ownerName、contactPhone、constructionUnit、constructionManager、managerPhone、applicationTime、startTime、completionTime、houseType、decorationCategory、customerApprovalStatus、engineeringApprovalStatus、depositApprovalStatus、createBy、action

### views/decorationManagement/RenovationSelfCheck/RenovationSelfCheck.vue

- 界面字段/筛选/提示：确定要删除该条记录吗？；自检表编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；提交时间；登记人；操作
- 绑定字段：idCode、regionName、projectName、roomNumber、applicationTime、createTime、createBy、action

### views/decorationManagement/SecondAcceptance/SecondAcceptance.vue

- 界面字段/筛选/提示：二次验收；二次验收编号；区域公司；项目名称；所属项目；请输入；房号；支持模糊查询；验收结果；全部；待指派；待验收；已通过；未通过；姓名；业主电话；验收时间；审核类型；验收人；提交审核时间；登记人；操作；确认重新发起二次验收？
- 绑定字段：idCode、regionName、projectName、roomNumber、acceptanceResult、ownerName、ownerPhone、applicationDate、auditType、acceptancePersonNames、createTime、createBy、action

## PC 弹窗与表单字段

- `views/decorationManagement/AgreementManagement/components/agreementSave.vue`：协议名称；正文内容。必填/校验提示：
- `views/decorationManagement/AgreementManagement/components/save.vue`：装修申请类别；所属项目；装修业态；收费科目；装修保证金；检查合格退款；房屋类型名称。必填/校验提示：
- `views/decorationManagement/BaseConfig/CheckConfig/components/CheckCategoryPane.vue`：
- `views/decorationManagement/BaseConfig/CheckConfig/components/CheckConfigImportModal.vue`：
- `views/decorationManagement/BaseConfig/CheckConfig/components/CheckConfigModal.vue`：检查小项内容；是否启用；是否必填；填报类型；排序；文本判断标准；最小标准值；最大标准值；数值判断标准；图片判断标准；示例图片；选项值；默认标准项。必填/校验提示：
- `views/decorationManagement/BaseConfig/CheckConfig/components/CheckItemPane.vue`：。必填/校验提示：
- `views/decorationManagement/BaseConfig/MaterialConfig/components/MaterialConfigModal.vue`：所属项目；房屋类型；装修类型；状态；房屋类型名称。必填/校验提示：
- `views/decorationManagement/DecorationPatrolModule/components/AssignTaskModal.vue`：审核通过房号；审批人；审批时间；指派装修巡查角色；role.roleName；整改通知审核角色；整改复核角色
- `views/decorationManagement/DecorationPatrolModule/components/ViolationDetailModal.vue`：违章位置；待整改内容；图片
- `views/decorationManagement/DecorationPermit/components/ExtendPermitModal.vue`：当前有效时间；延期月数；延期后结束时间。必填/校验提示：
- `views/decorationManagement/DecorationPermit/components/OfflinePaymentVerifyModal.vue`：收费科目；审核保证金（元）；财务收款单号。必填/校验提示：
- `views/decorationManagement/DecorationPermit/components/PermitModal.vue`：
- `views/decorationManagement/DecorationPermit/components/RegisterModal.vue`：业主租户；房号；施工单位；施工人数；安全责任人；具体施工内容。必填/校验提示：身份证号码格式不正确；请输入正确的座机号或手机号；姓名长度不能超过20个字符；姓名只能包含中英文
- `views/decorationManagement/DecorationPermit/components/ValidityConfigModal.vue`：
- `views/decorationManagement/DecorationRecord/components/EndDecorationModal.vue`：房号；业主姓名；结束原因。必填/校验提示：
- `views/decorationManagement/DecorationRecord/components/ModifyEndTimeModal.vue`：项目；装修房屋类型；申请业主；联系电话；装修房号；施工时间；装修类别；施工单位；装修公司名称；装修公司负责人；负责人联系电话
- `views/decorationManagement/DecorationRecord/components/OfflineRefundModal.vue`：房号；业主；收费科目；应退保证金（元）；原收款单号；财务退款单号。必填/校验提示：
- `views/decorationManagement/FirstAcceptance/components/AssignAcceptanceModal.vue`：房号；验收人员；item.label。必填/校验提示：
- `views/decorationManagement/FirstAcceptance/components/FirstAcceptanceAddModal.vue`：所属项目；房栋；房号；姓名；业主电话；申请验收日期；申请类型；验收人员；item.label；装修房屋类型；装修类别。必填/校验提示：请输入正确的座机号或手机号
- `views/decorationManagement/FirstAcceptance/components/FirstAcceptanceDetailModal.vue`：
- `views/decorationManagement/InspectionRecord/components/InspectionDetailModal.vue`：
- `views/decorationManagement/OnlineReview/components/AddDecorationModal.vue`：所属项目；房栋；房号；姓名；联系电话；身份证号；施工单位；装修公司名称；施工方负责人；负责人联系电话；负责人身份证号；申请时间；装修开始时间；装修竣工时间；房屋类型；装修类别。必填/校验提示：请输入正确的座机号或手机号；请输入正确的身份证号
- `views/decorationManagement/OnlineReview/components/ApprovalModal.vue`：项目；装修房屋类型；申请业主；联系电话；装修房号；施工时间；装修类别；施工单位；装修公司名称；装修公司负责人；负责人联系电话
- `views/decorationManagement/OnlineReview/components/DocumentReview.vue`：
- `views/decorationManagement/OnlineReview/components/DynamicMaterialUpload.vue`：item.itemName。必填/校验提示：
- `views/decorationManagement/OnlineReview/components/ImageEditor.vue`：
- `views/decorationManagement/OnlineReview/components/ImageReview.vue`：
- `views/decorationManagement/RenovationSelfCheck/components/detail.vue`：房号；自检表；备注
- `views/decorationManagement/RenovationSelfCheck/components/save.vue`：所属项目；房号；自检表；处理状态；备注。必填/校验提示：
- `views/decorationManagement/SecondAcceptance/components/SecondAcceptanceAddModal.vue`：项目名称；房栋；房号；姓名；业主电话；申请验收日期；申请类型；验收人员；item.label；装修房屋类型；装修类别。必填/校验提示：请输入正确的座机号或手机号

## H5 业务来源

原 `src/pages.json` 注册 `page_subject/decorationApply`，其 API 实际请求 ts-repair。候选 ts-zjmerchantapplet 未被这一调用链命中，不迁移无关小程序功能。

- `application.vue`：装修申请；请输入身份证号；请输入装修公司名称；请输入负责人姓名；请输入联系电话；请输入身份证号码；请返回装修首页重新选择房屋；当前项目暂无可申请的装修房屋类型；请选择装修房屋类型；请输入正确的身份证号；请选择装修类别；请选择施工开始时间；请选择施工结束时间；结束时间须晚于开始时间；请输入正确的联系电话；请输入正确的负责人身份证号
- `applicationForm.vue`：申请表确认；房号；姓名；联系电话；装修单位名称；装修负责人姓名；装修负责人身份证号；装修负责人联系电话；申请时间；装修期限；请完成业主签名；正在生成申请表...；申请表生成失败，请重试
- `detail.vue`：装修申请页面；装修房屋类型；申请业主；联系电话；装修类别；施工时间；施工单位；装修公司名称；负责人；负责人联系电话；装修图纸审核；资料审核；装修申请；费用缴纳；领取装修备案证明；首次验收；二次验收；退费申请；加载中...；请返回装修申请入口重新选择房屋；暂无可查看内容
- `drawings.vue`：装修图纸；item.itemName；拆改图；原始平面图；水电气图；效果图；业主身份证正面；业主身份证反面；装修公司资质证书；装修公司营业执照；负责人身份证正面；负责人身份证反面
- `fireSafety.vue`：消防责任书；一、 消防安全责任；二、 消防设施及器材管理；三、 动火作业管理；四、 易燃易爆物品管理；五、 用电安全管理；六、 其他要求；七、 消防安全责任；承诺单位或个人（签章）：；请完成承诺人签名；正在生成责任书...；提交失败，请重试
- `firstAcceptance.vue`：首次验收；加载中...；请先到物业前台打印装修备案证明；申请信息缺失；请先打印装修备案证明；提示；提交中...；提交成功；提交失败
- `index.vue`：装修申请；费用缴纳；领取装修备案证明；首次验收；二次验收；退费申请；当前房屋业主信息未完整获取，请刷新后重试；暂无可切换房屋；请先绑定房屋；暂无已通过的装修申请；请先完成费用缴纳；请先完成装修申请审核；暂无装修申请；二次验收通过后可申请退费；请先领取装修备案证明；请先完成首次验收；当前步骤暂未开放
- `inspectionRectification.vue`：巡检整改；加载中...；加载失败；整改记录缺失，无法申请；提交中...；申请成功
- `materialReview.vue`：pageTitle；item.label；加载中...；文件较大，请等待；已下载，请在微信下载列表查看；文件下载失败；资料信息异常；提交中...；已重新提交
- `materialSign.vue`：item.itemName || ；资料已停用；正在打开...；文件打开失败；请完成业主签名；正在生成确认文件...；资料确认生成失败，请重试
- `materials.vue`：资料；正在打开...；文件打开失败
- `myApplications.vue`：装修记录；申请ID缺失
- `notice.vue`：装修须知；一、 客户保证书；二、 装修现场管理责任；请完成业主签名；正在生成须知确认...；须知确认生成失败，请重试
- `payment.vue`：费用缴纳；加载中...；加载失败；暂无可缴纳保证金；调起支付中...；确认支付中...；缴纳成功；支付处理中，请稍后刷新
- `permit.vue`：领取装修备案证明；加载中...；当前申请尚未全部审核通过；加载失败；申请信息缺失
- `permitLetter.vue`：授权书模板；生成中...；图片生成中，请稍后；已保存到相册；提示；保存失败
- `refund.vue`：退费申请；加载中...；加载失败；二次验收通过后可申请退费；暂无可退保证金
- `result.vue`：提交结果
- `secondAcceptance.vue`：二次验收；加载中...；申请信息缺失；请先完成首次验收；提示；提交中...；提交成功；提交失败
- `selfCheck.vue`：装修自检；请完成所有自检项；请完成业主签名；正在生成自检表...；提交失败，请重试；请返回装修首页重新选择房屋
- `serviceAgreement.vue`：服务协议；六、安全保证；七、施工过程处理措施；八、协议效力；一、装修审图；二、图纸审核：；三、装修施工申请、需交纳的费用：；四、装修时间：；五、装修规定；甲方：；乙方：；乙方房屋基本情况：；房号：；建筑面积：；装修期限：；签署时间：；请完成乙方签名；正在生成服务协议...；服务协议生成失败，请重试
- `sign.vue`：请先签名；提示；签名上传中...；签名上传失败

## 后端持久字段（按原实体顺序）

旧 Long 主键迁移为新服务 String ID；houseId 对应基础档案 spaceId。projectId、customerId、ownerUserId 分开保存。以下保留旧字段名称用于核对，不代表照搬基础表或将原实体直接作为新写入 DTO。

- `DecorationAcceptance.java`：idCode (String)、projectId (String)、projectName (String)、roomNumber (String)、ownerName (String)、ownerPhone (String)、applicationDate (Date)、acceptanceType (Long)、acceptancePersonIds (String)、acceptancePersonNames (String)、inspectionContentImage (String)、acceptanceFeedback (String)、acceptancePersonList (List<String>)、submitterUserId (String)、decorationApplicationId (Long)、ownerId (String)、source (String)、actualEndTime (Date)
- `DecorationAcceptanceResult.java`：description (final String)
- `DecorationAcceptanceTask.java`：idCode (String)、acceptanceId (Long)、projectId (String)、projectName (String)、roomNumber (String)、acceptanceType (Long)、assignedUserId (String)、assignedUserName (String)、assignedUserPhone (String)、status (Long)、acceptanceTime (Date)、rectificationDeadline (Date)、feedback (String)、acceptanceImages (String)、inspectionContent (String)、inspectionImage (String)、checkResults (List<DecorationCheckResult>)
- `DecorationAgreement.java`：idCode (String)、applicationCategory (String)、projectId (String)、projectName (String)、decorationFormat (String)、chargeItemId (Long)、chargeItemName (String)、decorationDeposit (BigDecimal)、firstRefund (BigDecimal)、secondRefund (BigDecimal)、garbageCleaningFee (BigDecimal)、accessCardFee (BigDecimal)、cashDeposit (BigDecimal)、costFee (BigDecimal)、managementFee (BigDecimal)、fireDrainageFee (BigDecimal)、fireAlarmPointManagementFee (BigDecimal)、extinguisherDeposit (BigDecimal)、extinguisherRentFee (BigDecimal)、restorationFee (BigDecimal)、partitionWallRemovalFee (BigDecimal)、constructionWaterFeeBelow300 (BigDecimal)、constructionWaterFeeAbove300 (BigDecimal)、temporaryElectricityFee (BigDecimal)、temporaryWaterFee (BigDecimal)、decorationSupplementaryAgreements (List<DecorationSupplementaryAgreement>)
- `DecorationApplication.java`：idCode (String)、applicationNumber (String)、ownerName (String)、houseId (Long)、ownerId (String)、roomNumber (String)、contactPhone (String)、ownerIdCard (String)、constructionUnit (String)、constructionManager (String)、managerPhone (String)、managerIdCard (String)、constructionType (Long)、applicationTime (Date)、startTime (Date)、completionTime (Date)、actualEndTime (Date)、endReason (String)、houseType (String)、decorationCategory (String)、projectId (String)、source (String)、decorationAgreementId (Long)、chargeItemId (Long)、chargeItemName (String)、paymentOrderId (String)、offlineReceiptNo (String)、paymentStatus (Integer)、paymentAmount (BigDecimal)、paidTime (Date)、refundId (Long)、refundNo (String)、offlineRefundReceiptNo (String)、refundTradeNo (String)、refundStatus (Integer)、refundAmount (BigDecimal)、refundApplyTime (Date)、refundTime (Date)
- `DecorationApplicationMaterial.java`：decorationApplicationId (Long)、materialType (String)、configId (Long)、configItemId (String)、itemName (String)、sourceType (String)、fileName (String)、fileUrls (String)、reviewStatus (Long)、reviewerId (String)、reviewerName (String)、reviewTime (Date)、reviewRemark (String)、markFileUrl (String)
- `DecorationApproval.java`：decorationApplicationId (Long)、projectId (String)、type (String)、depositAmount (BigDecimal)、customerData (String)、status (Long)、approverName (String)、approverId (String)、approvalTime (Date)、remark (String)、fileUrl (String)、markFileUrl (String)
- `DecorationCheckCategory.java`：categoryId (String)、categoryName (String)、sort (Integer)、items (List<DecorationCheckItem>)
- `DecorationCheckConfig.java`：projectId (String)、houseType (String)、decorationType (String)、scene (String)、status (Integer)、categoryItemsJson (String)、categoryItems (List<DecorationCheckCategory>)
- `DecorationCheckItem.java`：itemId (String)、itemName (String)、inputType (String)、required (Integer)、enabled (Integer)、standardValue (String)、minValue (String)、maxValue (String)、optionValues (List<String>)、exampleText (String)、imageStandard (String)、exampleImage (String)、sort (Integer)
- `DecorationCheckResult.java`：recordType (String)、recordId (Long)、decorationApplicationId (Long)、projectId (String)、configId (Long)、configItemId (String)、categoryName (String)、itemName (String)、inputType (String)、itemValue (String)、imageUrls (String)、qualified (Integer)、rectificationContent (String)、nonStandard (Integer)、rectificationDeadline (Date)
- `DecorationInspectionPendingViolation.java`：idCode (String)、inspectionRecordId (Long)、projectId (String)、violationLocation (String)、rectificationContent (String)、imageUrl (String)
- `DecorationInspectionRecord.java`：idCode (String)、inspectionTaskId (Long)、decorationApplicationId (Long)、projectId (String)、inspectionTime (Date)、inspectorId (String)、inspectorName (String)、hasViolation (Long)、inspectionResult (String)、feedback (String)、inspectionImages (String)、isRectified (Long)、violationAuditStatus (Long)、violationAuditRoleId (String)、violationAuditRoleName (String)、violationAuditorName (String)、violationAuditTime (Date)、violationAuditRemark (String)、rectificationReviewRoleId (String)、rectificationReviewRoleName (String)、operator (String)、operateTime (Date)、rectificationImages (String)、violationList (List<DecorationInspectionViolation>)
- `DecorationInspectionTask.java`：idCode (String)、decorationApplicationId (Long)、projectId (String)、assignedUserId (String)、assignedUserName (String)、assignedUserPhone (String)、roleId (String)、roleName (String)、violationAuditRoleId (String)、violationAuditRoleName (String)、rectificationReviewRoleId (String)、rectificationReviewRoleName (String)、inspectionFrequency (Integer)、completedCount (Integer)、status (Long)、startTime (Date)、endTime (Date)、remark (String)、projectName (String)
- `DecorationInspectionViolation.java`：idCode (String)、inspectionRecordId (Long)、projectId (String)、violationLocation (String)、rectificationContent (String)、imageUrl (String)
- `DecorationMaterialConfig.java`：projectId (String)、projectName (String)、houseType (String)、decorationType (String)、status (Integer)、materialItemsJson (String)、drawingItemsJson (String)、materialItems (List<DecorationMaterialConfigItem>)、drawingItems (List<DecorationMaterialConfigItem>)
- `DecorationMaterialConfigItem.java`：itemId (String)、itemName (String)、sourceType (String)、fileName (String)、fileUrl (String)、pdfPreviewUrls (String)、previewImageUrls (String)、required (Integer)、enabled (Integer)、sort (Integer)
- `DecorationPermit.java`：idCode (String)、decorationApplicationId (Long)、permitNumber (String)、projectId (String)、ownerName (String)、roomNumber (String)、managerName (String)、constructionUnit (String)、safetyPerson (String)、safetyPhone (String)、decorationContent (String)、startTime (Date)、completionTime (Date)、status (Long)、isEntrusted (Long)、workerCount (Integer)、approver (String)、approverPhone (String)、validStartTime (Date)、validEndTime (Date)、validityMonthsSnapshot (Integer)、extended (Long)、preExpireRemindTime (Date)、expireRemindTime (Date)、lastExtendTime (Date)、printTime (Date)、workers (List<DecorationPermitWorker>)
- `DecorationPermitExtensionRecord.java`：permitId (Long)、decorationApplicationId (Long)、beforeEndTime (Date)、afterEndTime (Date)、extendMonths (Integer)、operatorId (String)、operatorName (String)
- `DecorationPermitValidityConfig.java`：projectId (String)、validityMonths (Integer)
- `DecorationPermitWorker.java`：decorationPermitId (Long)、projectId (String)、workerName (String)、idCardNumber (String)、phone (String)、entryDate (Date)、expirationDate (Date)
- `DecorationSelfInspection.java`：idCode (String)、projectId (String)、roomNumber (String)、fileUrl (String)、remark (String)、status (Long)
- `DecorationStatus.java`：description (final String)、phase (final String)
- `DecorationSupplementaryAgreement.java`：idCode (String)、decorationAgreementId (Long)、projectId (String)、agreementName (String)、agreementContent (String)
- `Notification.java`：projectId (String)、title (String)、subtitle (String)、content (String)、messageId (String)、status (Long)、receiverId (String)

## 原 API 动作证据

这些是旧接口定位表；新接口以装修服务为边界，不能用旧 API 的通用更新或删除绕开动作校验。

### DecorationAcceptanceRest.java

- `POST /add` 新增装修验收
- `POST /restart/{id}` 重新发起PC来源装修申请的未通过验收
- `POST /page` 分页查询装修验收
- `GET /detail/{id}` 查询装修验收详情
- `GET /assignable-users/{applicationId}` 根据装修申请查询可选验收人员
- `GET /assignable-users/project/{projectId}` 根据项目查询可选验收人员
- `PUT /modi/{id}` 修改装修验收
- `POST /del` 批量删除装修验收

### DecorationAcceptanceTaskRest.java

- `POST /add` 新增装修验收任务
- `POST /assign` 分配装修验收任务
- `POST /page` 分页查询装修验收任务
- `POST /my-tasks` 查询我的验收任务（分页）
- `GET /detail/{id}` 查询装修验收任务详情
- `GET /by-acceptance/{acceptanceId}` 根据验收ID查询装修验收任务列表
- `PUT /modi/{id}` 修改装修验收任务
- `POST /del` 批量删除装修验收任务
- `POST /del/by-acceptance/{acceptanceId}` 根据验收ID删除装修验收任务
- `POST /submit-feedback` 提交验收反馈

### DecorationAgreementRest.java

- `POST /page` 分页查询装修协议（支持条件查询）
- `GET /detail/{id}` 查询装修协议详情
- `POST /match` 根据项目和装修业态匹配装修协议
- `POST /house-types` 查询已配置装修协议的房屋类型
- `PUT /modi/{id}` 修改装修协议
- `POST /del` 批量删除装修协议
- `POST /supplementary/add` 新增补充协议
- `POST /supplementary/batch` 批量新增补充协议
- `PUT /supplementary/modi/{id}` 修改补充协议
- `POST /supplementary/del` 批量删除补充协议
- `POST /supplementary/del/by-agreement/{agreementId}` 根据装修协议ID删除补充协议
- `GET /supplementary/detail/{id}` 查询补充协议详情
- `GET /supplementary/by-agreement/{agreementId}` 根据装修协议ID查询补充协议列表

### DecorationApplicationRest.java

- `POST /add` 新增装修申请（包含审核信息）
- `PUT /resubmit-pc/{id}` PC端驳回后重新提交装修申请
- `POST /list` 查询装修申请列表
- `POST /page` 分页查询装修申请（包含审核状态）
- `GET /detail/{id}` 查询装修申请详情（包含审核状态）
- `PUT /modi/{id}` 修改装修申请
- `POST /del` 批量删除装修申请
- `POST /query` 分页复杂条件查询装修申请（完整信息）
- `POST /home-statistics` 装修首页统计
- `POST /create-simple` 快速创建装修申请（自动生成编号）
- `POST /owner-submit` 业主端一站式提交装修申请
- `PUT /owner-material-review` PC端审核业主提交的装修材料
- `PUT /owner-material-resubmit` 业主端重传被驳回的装修材料
- `POST /my-applications` 业主端我的装修申请
- `GET /my-detail/{id}` 业主端装修申请详情

### DecorationApprovalRest.java

- `POST /add` 新增装修审核信息
- `GET /detail/{id}` 查询装修审核信息详情
- `GET /application/{applicationId}` 根据装修申请ID查询审核信息列表
- `PUT /modi/{id}` 修改装修审核信息
- `POST /del` 批量删除装修审核信息

### DecorationCheckConfigRest.java

- `POST /page` 分页查询巡检验收配置
- `GET /detail/{id}` 查询巡检验收配置详情
- `POST /save` 保存巡检验收配置
- `POST /delete` 删除巡检验收配置
- `POST /match` 匹配巡检验收配置
- `POST /category/list` 按三维查询巡检大类列表
- `POST /category/save` 新增或编辑巡检大类
- `POST /category/delete` 删除巡检大类
- `POST /item/page` 按巡检大类分页查询子项
- `POST /item/save` 新增或编辑巡检子项
- `POST /item/delete` 删除巡检子项
- `GET /importTemplate` 下载巡检验收内容配置导入模板

### DecorationInspectionRecordRest.java

- `POST /add` 新增装修巡查记录
- `POST /page` 分页查询装修巡查记录
- `POST /list-page` 分页查询装修巡查记录列表（返回指定字段）
- `POST /detail-page` 分页查询巡检记录详情（弹窗展示）
- `POST /violation-records` 分页查询违章巡检记录
- `POST /rectification` 提交整改
- `POST /rectification/owner-submit` 业主端提交巡检整改
- `POST /rectification/pass` 巡检整改审核通过
- `POST /rectification/reject` 巡检整改审核驳回
- `POST /violation-audit` 整改通知审核
- `POST /rectification/reassign-review-role` 重新指定整改复核角色
- `GET /detail/{id}` 查询装修巡查记录详情
- `GET /violation-detail/{recordId}` 查询违章详情（包含所有违章信息）
- `GET /violation/{id}` 查询单个违章详情
- `GET /by-application/{applicationId}` 根据装修申请ID查询装修巡查记录
- `GET /by-task/{taskId}` 根据巡检任务ID查询装修巡查记录
- `PUT /modi/{id}` 修改装修巡查记录
- `POST /del` 批量删除装修巡查记录
- `POST /del/by-application/{applicationId}` 根据装修申请ID删除装修巡查记录

### DecorationInspectionRest.java

- `POST /page` 分页查询装修巡检列表

### DecorationInspectionTaskRest.java

- `POST /add` 新增装修巡检任务
- `POST /assign` 分配装修巡检任务
- `POST /restart/{inspectionRecordId}` 重新发起PC来源装修申请的整改巡检
- `POST /submit-feedback` 提交巡检反馈
- `POST /page` 分页查询装修巡检任务
- `POST /page-with-details` 分页查询装修巡检（包含完整信息）
- `POST /my-tasks` 查询我的巡检任务（分页）
- `GET /detail/{id}` 查询装修巡检任务详情
- `GET /by-application/{applicationId}` 根据装修申请ID查询装修巡检任务列表
- `PUT /modi/{id}` 修改装修巡检任务
- `POST /del` 批量删除装修巡检任务
- `POST /del/by-application/{applicationId}` 根据装修申请ID删除装修巡检任务

### DecorationInspectionViolationRest.java

- `POST /add` 新增装修巡检违章信息
- `GET /detail/{id}` 查询装修巡检违章信息详情
- `GET /by-record/{recordId}` 根据巡检记录ID查询违章信息列表
- `PUT /modi/{id}` 修改装修巡检违章信息
- `POST /del` 批量删除装修巡检违章信息
- `POST /del/by-record/{recordId}` 根据巡检记录ID删除违章信息

### DecorationMaterialConfigRest.java

- `POST /page` 分页查询装修资料配置
- `GET /detail/{id}` 查询装修资料配置详情
- `POST /save` 保存装修资料配置
- `POST /delete` 删除装修资料配置
- `POST /match` 匹配装修资料配置

### DecorationPaymentRest.java

- `POST /submit` 业主端发起装修保证金支付
- `POST /confirm` 业主端确认装修保证金支付结果
- `POST /offline/verify` PC线下装修保证金收款核验

### DecorationPermitRest.java

- `POST /add` 新增装修许可（包含施工人员）
- `POST /process/{permitId}` 办理装修许可证（生成许可证编号）
- `POST /print/{permitId}` 打印装修许可证（设置打印时间）
- `POST /page` 分页查询装修许可（支持条件查询）
- `GET /detail/{id}` 查询装修许可详情
- `GET /by-application/{applicationId}` 根据装修申请ID查询装修许可
- `PUT /modi/{id}` 修改装修许可
- `POST /del` 批量删除装修许可
- `POST /del/by-application/{applicationId}` 根据装修申请ID删除装修许可
- `POST /create/by-application/{applicationId}` 根据装修申请ID创建装修许可并生成许可证编号
- `GET /validity-config/list` 查询装修备案有效期配置
- `POST /validity-config/save` 保存装修备案有效期配置
- `POST /extend` 延期装修备案证明

### DecorationRefundRest.java

- `POST /submit` Submit decoration deposit original-route refund
- `POST /status` Query decoration deposit refund status
- `POST /offline/verify` PC线下装修保证金退款核验

### DecorationRoleRest.java

- `POST /listByCurrentUserProjects` 查询当前用户所在项目下的所有角色信息

### DecorationSelfInspectionRest.java

- `POST /add` 新增装修自检
- `POST /page` 分页查询装修自检（支持条件查询）
- `GET /detail/{id}` 查询装修自检详情
- `PUT /modi/{id}` 修改装修自检
- `POST /del` 批量删除装修自检

### DecorationTaskStatisticsRest.java

- `GET /today-summary` 查询今日已完成的任务汇总

## 状态和业务门槛

| 维度 | 原契约 | 新实现要求 |
| --- | --- | --- |
| 审核 | 0待审核 / 1通过 / 2驳回，资料和图纸分项，deposit单独 | 任一驳回不能缴费；全部通过和金额审核通过才可支付 |
| 金额 | >0，最多两位小数，≤9999999999.99 | 金额取审核结果，不能由H5自行传入支付金额 |
| 支付/退款 | 0未发起 / 1处理中 / 2成功 / 失败状态见支付实体 | 接入前503，拒绝客户端标记成功；外部结果待确认不能重做 |
| 备案证 | 未打印待领取、打印后已领取；有效期和延期独立 | 留存有效期月数快照、原有效期/新有效期和操作者 |
| 验收 | 验收任务0待办 / 1通过 / 2整改/未通过 | 当前轮次所有人员通过才推进；旧轮次保留，不参与当前汇总 |
| 整改通知 | 审核后才可通知业主；整改后指定角色复核 | 指派、通知审核、业主提交和复核分离 |
| 结束 | actualEndTime禁止新流程 | 手动结束带原因；不代表资金已退 |

## 验收重点

项目切换清空旧上下文和分页；基础故障不变空列表；跨项目、跨账号、附件直链和导出同范围；同房并发申请、同版本并发审核、重复提交、未保存退出、失败重传；配置修改保留旧快照；财务未接通禁止付款/退款假成功。浏览器验证与真实网关权限验证独立记录。
