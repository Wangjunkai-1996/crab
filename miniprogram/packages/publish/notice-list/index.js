"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ui_1 = require("../../../constants/ui");
const bootstrap_service_1 = require("../../../services/bootstrap.service");
const notice_service_1 = require("../../../services/notice.service");
const ui_store_1 = require("../../../stores/ui.store");
const formatter_1 = require("../../../utils/formatter");
const page_state_1 = require("../../../utils/page-state");
const router_1 = require("../../../utils/router");
function getActionConfig(item) {
    if (item.statusTag === 'active') {
        return {
            primaryText: '报名管理',
            primaryAction: 'manage',
            secondaryText: '查看详情',
            secondaryAction: 'view',
            dangerText: '关闭',
            dangerAction: 'close',
        };
    }
    if (item.statusTag === 'pending_review') {
        return {
            primaryText: '查看详情',
            primaryAction: 'view',
            secondaryText: '',
            secondaryAction: '',
            dangerText: '',
            dangerAction: '',
        };
    }
    if (item.statusTag === 'supplement_required' || item.statusTag === 'rejected' || item.statusTag === 'draft') {
        return {
            primaryText: '编辑',
            primaryAction: 'edit',
            secondaryText: '查看详情',
            secondaryAction: 'view',
            dangerText: '',
            dangerAction: '',
        };
    }
    return {
        primaryText: '查看报名',
        primaryAction: 'manage',
        secondaryText: '查看详情',
        secondaryAction: 'view',
        dangerText: '',
        dangerAction: '',
    };
}
function getActionHint(item) {
    if (item.statusTag === 'active') {
        return '当前已经在广场曝光，优先看报名量和报名管理，再决定是否需要关闭。';
    }
    if (item.statusTag === 'pending_review') {
        return '当前在审核中，先看详情页里的资料是否完整，避免来回切页。';
    }
    if (item.statusTag === 'supplement_required' || item.statusTag === 'rejected') {
        return '当前更适合先回编辑页补信息，再决定是否重新提审。';
    }
    if (item.statusTag === 'draft') {
        return '当前还是草稿，先把核心字段补齐，再回发布页决定是否提交审核。';
    }
    return '先看当前状态，再决定是继续管理报名还是回详情页复核。';
}
function decorate(list) {
    return list.map((item) => ({
        ...item,
        statusText: (0, formatter_1.formatNoticeStatus)(item.statusTag),
        actionConfig: getActionConfig(item),
        actionHint: getActionHint(item),
    }));
}
function buildStats(list) {
    return [
        { label: '全部', value: list.length },
        { label: '待审核', value: list.filter((item) => item.statusTag === 'pending_review').length },
        { label: '进行中', value: list.filter((item) => item.statusTag === 'active').length },
    ];
}
function buildFocusNotice(list) {
    const candidate = list.find((item) => item.statusTag === 'supplement_required') ||
        list.find((item) => item.statusTag === 'pending_review') ||
        list.find((item) => item.statusTag === 'active') ||
        list[0];
    if (!candidate) {
        return null;
    }
    return {
        title: candidate.title,
        badgeText: (0, formatter_1.formatNoticeStatus)(candidate.statusTag),
        copy: getActionHint(candidate),
    };
}
Page({
    data: {
        topInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        tabs: ui_1.MY_NOTICE_STATUS_TABS,
        activeStatus: 'all',
        rawNotices: [],
        notices: [],
        stats: [],
        focusNotice: null,
        filteredEmpty: false,
        errorText: '',
    },
    onLoad() {
        this.setData({ topInset: ui_store_1.uiStore.getState().safeArea.statusBarHeight });
        this.loadPage();
    },
    applyFilter() {
        const activeStatus = this.data.activeStatus;
        const rawList = this.data.rawNotices || [];
        const nextList = activeStatus === 'all' ? rawList : rawList.filter((item) => item.statusTag === activeStatus);
        const hasAnyData = rawList.length > 0;
        this.setData({
            notices: decorate(nextList),
            stats: buildStats(rawList),
            focusNotice: buildFocusNotice(rawList),
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
            const result = await (0, notice_service_1.myList)();
            this.setData({
                rawNotices: result.list || [],
            });
            this.applyFilter();
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '列表加载失败',
            });
        }
    },
    onSwitchStatus(event) {
        this.setData({
            activeStatus: `${event.currentTarget.dataset.value}`,
        });
        this.applyFilter();
    },
    async onTapAction(event) {
        const noticeId = `${event.currentTarget.dataset.id}`;
        const action = `${event.currentTarget.dataset.action}`;
        const currentNotice = (this.data.rawNotices || []).find((item) => item.noticeId === noticeId);
        if (action === 'republish') {
            wx.showToast({
                title: (0, notice_service_1.getRepublishBlockReason)(currentNotice?.statusTag) || '当前暂不开放重新发布',
                icon: 'none',
            });
            return;
        }
        if (action === 'view') {
            (0, router_1.navigateByRoute)(`/pages/plaza/notice-detail?noticeId=${noticeId}`);
            return;
        }
        if (action === 'edit') {
            (0, router_1.navigateByRoute)(`/packages/publish/edit/index?noticeId=${noticeId}`);
            return;
        }
        if (action === 'manage') {
            (0, router_1.navigateByRoute)(`/packages/publish/application-manage/index?noticeId=${noticeId}`);
            return;
        }
        if (action === 'close') {
            try {
                await (0, notice_service_1.closeNotice)(noticeId);
                wx.showToast({ title: '已提交关闭', icon: 'success' });
                this.loadPage();
            }
            catch (error) {
                wx.showToast({
                    title: error instanceof Error ? error.message : '关闭失败',
                    icon: 'none',
                });
            }
        }
    },
    onEmptyAction() {
        (0, router_1.navigateByRoute)('/pages/publish/index');
    },
});
