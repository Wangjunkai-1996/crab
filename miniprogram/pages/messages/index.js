"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routes_1 = require("../../constants/routes");
const ui_1 = require("../../constants/ui");
const message_service_1 = require("../../services/message.service");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const user_store_1 = require("../../stores/user.store");
const ui_store_1 = require("../../stores/ui.store");
const page_state_1 = require("../../utils/page-state");
const router_1 = require("../../utils/router");
Page({
    data: {
        topInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        tabs: ui_1.MESSAGE_TYPE_TABS,
        activeType: 'all',
        messages: [],
        unreadCount: 0,
        emptyTitle: '当前分类暂无消息',
        emptyDescription: '先回到广场或发布页继续操作，相关通知会自动进入这里。',
        errorText: '',
    },
    onLoad() {
        this.setData({
            topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight,
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
            const result = await (0, message_service_1.list)(this.data.activeType);
            (0, user_store_1.setUnreadCount)(result.unreadCount);
            this.setData({
                messages: result.list,
                unreadCount: result.unreadCount,
                pageState: result.list.length ? page_state_1.PAGE_STATUS.ready : page_state_1.PAGE_STATUS.empty,
                emptyTitle: this.data.activeType === 'all' ? '当前暂无消息' : '当前分类暂无消息',
                emptyDescription: this.data.activeType === 'all' ? '后续审核通知、报名进展和系统提醒都会汇总到这里。' : '切回“全部”或继续操作后，相关通知会自动进入这里。',
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '消息列表加载失败',
            });
        }
    },
    onSwitchTab(event) {
        this.setData({
            activeType: `${event.currentTarget.dataset.value}`,
        });
        this.loadPage();
    },
    async onTapMessage(event) {
        const message = event.detail;
        if (!message.isRead) {
            await (0, message_service_1.markRead)(message.messageId);
            this.loadPage();
        }
        if (message.relatedObjectType === 'notice' && message.relatedObjectId) {
            (0, router_1.navigateByRoute)(`/pages/plaza/notice-detail?noticeId=${message.relatedObjectId}`);
            return;
        }
        if (message.relatedObjectType === 'application') {
            (0, router_1.navigateByRoute)(routes_1.ROUTES.creatorApplicationList);
        }
    },
    async onMarkAllRead() {
        await (0, message_service_1.markAllRead)();
        this.loadPage();
    },
});
