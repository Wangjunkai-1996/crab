"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const application_service_1 = require("../../../services/application.service");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
const router_1 = require("../../../utils/router");
const ACTION_LABELS = {
    markViewed: '标记已查看',
    markContactPending: '标记待联系',
    markCommunicating: '标记已沟通',
    markRejected: '标记未入选',
    markCompleted: '标记已完成',
    revealCreatorContact: '查看联系方式',
};
function decorateList(list) {
    return list.map((item) => ({
        ...item,
        statusText: (0, formatter_1.formatApplicationStatus)(item.status),
        platformLabel: (0, formatter_1.formatPlatform)(item.creatorCardSnapshot.primaryPlatform),
        categoryLabel: (0, formatter_1.formatCategory)(item.creatorCardSnapshot.primaryCategory),
        contactStateText: item.contactRevealState === 'revealed'
            ? '联系方式已释放'
            : item.contactRevealState === 'masked'
                ? '已留联系方式'
                : '联系方式未释放',
    }));
}
function buildStats(list) {
    const pendingCount = list.filter((item) => ['applied', 'viewed', 'contact_pending', 'communicating'].includes(item.status)).length;
    const handledCount = list.filter((item) => ['rejected', 'completed', 'withdrawn'].includes(item.status)).length;
    return [
        { label: '全部报名', value: list.length },
        { label: '待推进', value: pendingCount },
        { label: '已处理', value: handledCount },
    ];
}
function decorateDetail(detail) {
    return {
        ...detail,
        statusText: (0, formatter_1.formatApplicationStatus)(detail.application.status),
        creatorItems: [
            { label: '达人昵称', value: detail.creatorSummary.displayName, required: true },
            { label: '所在城市', value: detail.creatorSummary.city, required: true },
            { label: '擅长平台', value: (0, formatter_1.formatPlatform)(detail.creatorSummary.primaryPlatform), required: true },
            { label: '擅长领域', value: (0, formatter_1.formatCategory)(detail.creatorSummary.primaryCategory), required: true },
            { label: '粉丝量级', value: detail.creatorSummary.followerBand, required: true },
            { label: '案例说明', value: detail.creatorSummary.caseDescription || '待补充' },
        ],
        applicationItems: [
            { label: '自我介绍', value: detail.application.selfIntroduction, required: true },
            { label: '可交付计划', value: detail.application.deliverablePlan, required: true },
            { label: '期望条件', value: detail.application.expectedTerms || '无额外补充' },
        ],
        actionButtons: detail.availableActions.map((action) => ({
            key: action,
            label: ACTION_LABELS[action] || action,
        })),
        contactTitle: detail.creatorContactRevealState === 'revealed' ? '达人联系方式' : '联系方式说明',
        contactCopy: detail.creatorContactRevealState === 'revealed'
            ? detail.maskedOrFullCreatorContact || '已按服务端规则释放联系方式。'
            : '联系方式展示完全以后端裁剪为准；前端不自行显示原始值。',
    };
}
Page({
    data: {
        topInset: 0,
        bottomInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        noticeId: '',
        applications: [],
        stats: [],
        selectedApplicationId: '',
        detail: null,
        detailLoading: false,
        detailErrorText: '',
        errorText: '',
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
            noticeId: query.noticeId || 'my-notice-002',
        });
        this.loadPage();
    },
    async loadPage(selectedApplicationId = '') {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
            detailErrorText: '',
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const result = await (0, application_service_1.publisherList)({
                noticeId: this.data.noticeId,
            });
            const applications = decorateList(result.list || []);
            const nextSelectedId = selectedApplicationId || this.data.selectedApplicationId || applications[0]?.applicationId || '';
            this.setData({
                applications,
                stats: buildStats(result.list || []),
                selectedApplicationId: nextSelectedId,
                pageState: applications.length ? page_state_1.PAGE_STATUS.ready : page_state_1.PAGE_STATUS.empty,
                detail: null,
            });
            if (nextSelectedId) {
                await this.loadDetail(nextSelectedId);
            }
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '报名管理加载失败',
            });
        }
    },
    async loadDetail(applicationId) {
        this.setData({
            detailLoading: true,
            detailErrorText: '',
            selectedApplicationId: applicationId,
        });
        try {
            const detail = await (0, application_service_1.publisherDetail)(applicationId);
            this.setData({
                detail: decorateDetail(detail),
            });
        }
        catch (error) {
            this.setData({
                detailErrorText: error instanceof Error ? error.message : '报名详情加载失败',
            });
        }
        finally {
            this.setData({
                detailLoading: false,
            });
        }
    },
    onRetry() {
        this.loadPage(this.data.selectedApplicationId);
    },
    onTapItem(event) {
        const applicationId = `${event.currentTarget.dataset.id || ''}`;
        if (!applicationId) {
            return;
        }
        this.loadDetail(applicationId);
    },
    async onTapAction(event) {
        const action = `${event.currentTarget.dataset.action || ''}`;
        const applicationId = `${event.currentTarget.dataset.id || this.data.selectedApplicationId || ''}`;
        if (!applicationId) {
            return;
        }
        this.setData({
            detailLoading: true,
        });
        try {
            if (action === 'markViewed') {
                await (0, application_service_1.markViewed)(applicationId);
            }
            if (action === 'markContactPending') {
                await (0, application_service_1.markContactPending)(applicationId);
            }
            if (action === 'markCommunicating') {
                await (0, application_service_1.markCommunicating)(applicationId);
            }
            if (action === 'markRejected') {
                await (0, application_service_1.markRejected)(applicationId);
            }
            if (action === 'markCompleted') {
                await (0, application_service_1.markCompleted)(applicationId);
            }
            if (action === 'revealCreatorContact') {
                await (0, application_service_1.revealCreatorContact)(applicationId);
            }
            wx.showToast({
                title: ACTION_LABELS[action] || '已更新',
                icon: 'success',
            });
            await this.loadPage(applicationId);
        }
        catch (error) {
            wx.showToast({
                title: error instanceof Error ? error.message : '操作失败',
                icon: 'none',
            });
            this.setData({
                detailLoading: false,
            });
        }
    },
    onPrimaryAction() {
        (0, router_1.navigateByRoute)(`/pages/plaza/notice-detail?noticeId=${this.data.noticeId}`);
    },
    onSecondaryAction() {
        this.loadPage(this.data.selectedApplicationId);
    },
});
