"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routes_1 = require("../../constants/routes");
const notice_service_1 = require("../../services/notice.service");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const ui_store_1 = require("../../stores/ui.store");
const formatter_1 = require("../../utils/formatter");
const page_state_1 = require("../../utils/page-state");
const router_1 = require("../../utils/router");
Page({
    data: {
        topInset: 0,
        bottomInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        noticeId: '',
        notice: null,
        publisherSummary: null,
        permissionState: null,
        ctaText: '立即报名',
        ctaAction: 'apply',
        disabledReason: '',
        contactText: '',
        contactCardTitle: '联系方式说明',
        contactCardCopy: '联系方式展示完全以后端返回为准，前端不自行释放。',
        reasonTitle: '',
        reasonCopy: '',
        showReasonCard: false,
        heroBadgeText: '',
        errorText: '',
    },
    onLoad(query) {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
            bottomInset: ui_store_1.uiStore.getState().safeArea.bottomInset,
            noticeId: query.noticeId || 'notice-001',
        });
        this.loadPage();
    },
    async loadPage() {
        this.setData({
            pageState: page_state_1.PAGE_STATUS.loading,
            errorText: '',
        });
        try {
            await (0, bootstrap_service_1.ensureBootstrapReady)();
            const result = await (0, notice_service_1.detail)(this.data.noticeId);
            const isTouristCta = result.ctaState.primaryAction === 'complete_creator_card';
            const canViewContact = result.permissionState.canViewPublisherContact;
            let reasonTitle = '';
            let reasonCopy = '';
            let showReasonCard = false;
            if (isTouristCta) {
                showReasonCard = true;
                reasonTitle = '为什么现在不能直接报名';
                reasonCopy = '你还没有完成达人名片；完善后将自动返回当前通告继续报名。';
            }
            else if (result.ctaState.disabledReason) {
                showReasonCard = true;
                reasonTitle = '当前状态说明';
                reasonCopy = result.ctaState.disabledReason;
            }
            this.setData({
                pageState: page_state_1.PAGE_STATUS.ready,
                notice: {
                    ...result.notice,
                    platformLabel: (0, formatter_1.formatPlatform)(result.notice.cooperationPlatform),
                    categoryLabel: (0, formatter_1.formatCategory)(result.notice.cooperationCategory),
                    statusText: (0, formatter_1.formatNoticeStatus)(result.notice.statusTag),
                },
                publisherSummary: result.publisherSummary,
                permissionState: result.permissionState,
                ctaText: result.ctaState.primaryText,
                ctaAction: result.ctaState.primaryAction,
                disabledReason: result.ctaState.disabledReason || '',
                contactText: result.maskedOrFullContact || '',
                contactCardTitle: canViewContact ? '发布方联系方式' : '联系方式说明',
                contactCardCopy: canViewContact
                    ? '当前联系方式可见，是因为服务端已确认进入可联系阶段。'
                    : 'V1 默认不在报名后立即完全公开联系方式，是否可见完全以服务端返回为准。',
                reasonTitle,
                reasonCopy,
                showReasonCard,
                heroBadgeText: isTouristCta ? '游客态' : result.permissionState.isOwner ? '发布方本人' : (0, formatter_1.formatNoticeStatus)(result.notice.statusTag),
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '详情加载失败，请稍后重试',
            });
        }
    },
    onRetry() {
        this.loadPage();
    },
    onPrimaryAction() {
        if (this.data.ctaAction === 'disabled') {
            wx.showToast({
                title: this.data.disabledReason || '当前不可操作',
                icon: 'none',
            });
            return;
        }
        if (this.data.ctaAction === 'apply') {
            (0, router_1.navigateByRoute)(`${routes_1.ROUTES.creatorApply}?noticeId=${this.data.noticeId}`);
            return;
        }
        if (this.data.ctaAction === 'view_application') {
            (0, router_1.navigateByRoute)(routes_1.ROUTES.creatorApplicationList);
            return;
        }
        if (this.data.ctaAction === 'view_applications') {
            (0, router_1.navigateByRoute)(`${routes_1.ROUTES.publishApplicationManage}?noticeId=${this.data.noticeId}`);
            return;
        }
        if (this.data.ctaAction === 'complete_creator_card') {
            (0, router_1.navigateByRoute)(routes_1.ROUTES.creatorCard);
        }
    },
    onSecondaryAction() {
        (0, router_1.navigateByRoute)(routes_1.ROUTES.plaza);
    },
    onReportNotice() {
        const title = encodeURIComponent(this.data.notice?.title || '当前通告');
        (0, router_1.navigateByRoute)(`${routes_1.ROUTES.mineReport}?targetType=notice&targetId=${this.data.noticeId}&targetTitle=${title}`);
    },
});
