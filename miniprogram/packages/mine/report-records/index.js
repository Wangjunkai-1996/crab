"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const report_service_1 = require("../../../services/report.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
function getStatusBucket(status) {
    if (status.includes('处理中') || status.includes('待')) {
        return 'processing';
    }
    if (status.includes('未成立')) {
        return 'invalid';
    }
    return 'handled';
}
function decorate(list) {
    return list.map((item) => ({
        ...item,
        targetTypeLabel: (0, formatter_1.formatReportTargetType)(item.targetType),
        reasonLabel: (0, formatter_1.formatReportReason)(item.reasonCode),
        statusBucket: getStatusBucket(item.status),
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
        this.setData({
            list: nextList,
            latestRecord: rawList[0] || null,
            pageState: nextList.length ? page_state_1.PAGE_STATUS.ready : page_state_1.PAGE_STATUS.empty,
        });
    },
    async loadPage() {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
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
});
