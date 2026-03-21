"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ui_1 = require("../../../constants/ui");
const application_service_1 = require("../../../services/application.service");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
function buildStats(list) {
    return [
        { label: '全部', value: list.length },
        { label: '待联系', value: list.filter((item) => item.status === 'contact_pending').length },
        { label: '已沟通', value: list.filter((item) => item.status === 'communicating').length },
    ];
}
function decorate(list) {
    return list.map((item) => ({
        ...item,
        statusText: (0, formatter_1.formatApplicationStatus)(item.status),
        contactText: item.canViewPublisherContact ? '联系方式可见' : '联系方式未释放',
    }));
}
Page({
    data: {
        topInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        tabs: ui_1.MY_APPLICATION_STATUS_TABS,
        activeStatus: 'all',
        rawList: [],
        list: [],
        stats: [],
        errorText: '',
    },
    onLoad() {
        this.setData({ topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight });
        this.loadPage();
    },
    applyFilter() {
        const activeStatus = this.data.activeStatus;
        const rawList = this.data.rawList || [];
        const nextList = activeStatus === 'all' ? rawList : rawList.filter((item) => item.status === activeStatus);
        this.setData({
            list: decorate(nextList),
            stats: buildStats(rawList),
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
            const result = await (0, application_service_1.myList)();
            this.setData({
                rawList: result.list || [],
            });
            this.applyFilter();
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '我的报名加载失败',
            });
        }
    },
    onSwitchStatus(event) {
        this.setData({
            activeStatus: `${event.currentTarget.dataset.value}`,
        });
        this.applyFilter();
    },
    onTapItem(event) {
        const applicationId = `${event.currentTarget.dataset.id}`;
        wx.navigateTo({
            url: `/packages/creator/application-detail/index?applicationId=${applicationId}`,
        });
    },
});
