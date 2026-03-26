"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const report_service_1 = require("../../../services/report.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
const router_1 = require("../../../utils/router");
function getStatusBucket(status) {
    if (status.includes('处理中') || status.includes('待')) {
        return 'processing';
    }
    if (status.includes('未成立')) {
        return 'invalid';
    }
    return 'handled';
}
function getNextActionText(item) {
    if (item.statusBucket === 'processing') {
        return '平台已接收举报，当前重点是等待处理结论或补充材料通知。';
    }
    if (item.statusBucket === 'invalid') {
        return '当前结果为未成立，建议优先回看处理摘要，确认是否需要补充新的有效证据。';
    }
    return '当前举报已有处理结果，建议优先看处理摘要，再决定是否还要继续反馈。';
}
function buildStats(list) {
    return [
        { label: '全部', value: list.length },
        { label: '处理中', value: list.filter((item) => item.statusBucket === 'processing').length },
        { label: '已处理', value: list.filter((item) => item.statusBucket === 'handled').length },
    ];
}
function decorate(list) {
    return list.map((item) => ({
        ...item,
        targetTypeLabel: (0, formatter_1.formatReportTargetType)(item.targetType),
        reasonLabel: (0, formatter_1.formatReportReason)(item.reasonCode),
        statusBucket: getStatusBucket(item.status),
        nextActionText: getNextActionText({
            ...item,
            statusBucket: getStatusBucket(item.status),
        }),
    }));
}
Page({
    data: {
        topInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        errorText: '',
        activeTab: 'all',
        tabs: [
            { label: '全部', value: 'all' },
            { label: '处理中', value: 'processing' },
            { label: '已处理', value: 'handled' },
            { label: '未成立', value: 'invalid' },
        ],
        rawList: [],
        list: [],
        latestRecord: null,
        stats: [],
        filteredEmpty: false,
    },
    onLoad() {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
        });
        this.loadPage();
    },
    applyFilter() {
        const rawList = this.data.rawList || [];
        const activeTab = this.data.activeTab;
        const nextList = activeTab === 'all' ? rawList : rawList.filter((item) => item.statusBucket === activeTab);
        const hasAnyData = rawList.length > 0;
        this.setData({
            list: nextList,
            latestRecord: rawList[0] || null,
            stats: buildStats(rawList),
            filteredEmpty: hasAnyData && nextList.length === 0,
            pageState: hasAnyData ? page_state_1.PAGE_STATUS.ready : page_state_1.PAGE_STATUS.empty,
        });
    },
    async loadPage() {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
            filteredEmpty: false,
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const result = await (0, report_service_1.myList)();
            this.setData({
                rawList: decorate((result.list || [])),
            });
            this.applyFilter();
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '举报记录加载失败',
            });
        }
    },
    onSwitchTab(event) {
        this.setData({
            activeTab: `${event.currentTarget.dataset.value || 'all'}`,
        });
        this.applyFilter();
    },
    onEmptyAction() {
        (0, router_1.navigateByRoute)('/packages/mine/report/index');
    },
});
