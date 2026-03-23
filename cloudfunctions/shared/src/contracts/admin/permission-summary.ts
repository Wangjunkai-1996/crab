export interface AdminPermissionSummary {
  pageAccess: {
    dashboard: boolean
    reviewList: boolean
    reviewDetail: boolean
    reportList: boolean
    reportDetail: boolean
    accountActionList: boolean
    operationLogList: boolean
    adminUserManagement: boolean
    systemConfigManagement: boolean
  }
  actionAccess: {
    claimReviewTask: boolean
    releaseReviewTask: boolean
    resolveReviewTask: boolean
    claimReport: boolean
    resolveReportBasic: boolean
    createWatchlist: boolean
    createRestrictedPublish: boolean
    createRestrictedApply: boolean
    createBanned: boolean
    createAccountAction: boolean
    releaseAccountAction: boolean
    forceRemoveNotice: boolean
    viewOperationLogList: boolean
    manageAdminUsers: boolean
    manageSystemConfigs: boolean
  }
}
