"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ui_1 = require("../../../constants/ui");
const routes_1 = require("../../../constants/routes");
const application_service_1 = require("../../../services/application.service");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
const router_1 = require("../../../utils/router");
function buildStats(list) {
    return [
        { label: '全部', value: list.length },
        { label: '待联系', value: list.filter((item) => item.status === 'contact_pending').length },
        { label: '已沟通', value: list.filter((item) => item.status === 'communicating').length },
    ];
}
function getNextActionText(item) {
    if (item.canViewPublisherContact) {
        return '联系方式已经释放，优先决定要不要立刻联系发布方并推进合作。';
    }
    if (item.status === 'contact_pending') {
        return '当前已进入待联系阶段，重点等发布方释放联系方式或进一步反馈。';
    }
    if (item.status === 'communicating') {
        return '当前已经进入沟通阶段，建议优先看详情页里的最新状态和说明。';
    }
    return item.stageHint || '当前报名仍在处理中，建议先看阶段提示再决定下一步。';
}
function buildFocusCard(list) {
    const candidate = list.find((item) => item.canViewPublisherContact) ||
        list.find((item) => item.status === 'contact_pending') ||
        list.find((item) => item.status === 'communicating') ||
        list[0];
    if (!candidate) {
        return null;
    }
    return {
        title: candidate.noticeTitle,
        badgeText: candidate.canViewPublisherContact ? '可联系' : (0, formatter_1.formatApplicationStatus)(candidate.status),
        copy: getNextActionText(candidate),
    };
}
function decorate(list) {
    return list.map((item) => ({
        ...item,
        statusText: (0, formatter_1.formatApplicationStatus)(item.status),
        contactText: item.canViewPublisherContact ? '联系方式可见' : '联系方式未释放',
        nextActionText: getNextActionText(item),
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
        focusCard: null,
        filteredEmpty: false,
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
        const hasAnyData = rawList.length > 0;
        this.setData({
            list: decorate(nextList),
            stats: buildStats(rawList),
            focusCard: buildFocusCard(rawList),
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
    onEmptyAction() {
        (0, router_1.navigateByRoute)(routes_1.ROUTES.plaza);
    },
});
