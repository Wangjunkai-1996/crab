"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const routes_1 = require("../../constants/routes");
const formatter_1 = require("../../utils/formatter");
const user_service_1 = require("../../services/user.service");
const bootstrap_service_1 = require("../../services/bootstrap.service");
const user_store_1 = require("../../stores/user.store");
const ui_store_1 = require("../../stores/ui.store");
const page_state_1 = require("../../utils/page-state");
const router_1 = require("../../utils/router");
function decorateAction(action) {
    return {
        ...action,
        helperText: action.locked ? action.lockedReason || '请先完善资料' : action.hint || '继续进入对应主流程处理',
    };
}
function buildRoleCards(summary) {
    return [
        {
            title: '发布方',
            badgeText: `${summary.publisherSummary.profileCompleteness}%`,
            copy: summary.roleFlags.publisherEnabled
                ? `资料已可用，当前累计 ${summary.publisherSummary.noticeCount} 条通告。`
                : '当前还没开通发布方能力，先补资料后再继续发布。',
        },
        {
            title: '达人',
            badgeText: `${summary.creatorSummary.cardCompleteness}%`,
            copy: summary.roleFlags.creatorEnabled
                ? `名片已可用，当前累计 ${summary.creatorSummary.applicationCount} 条报名。`
                : '当前还没开通达人能力，先补名片后再继续报名。',
        },
    ];
}
function buildActionGroups(summary) {
    const decorated = summary.quickActions.map(decorateAction);
    const preferredView = summary.preferredView || (summary.roleFlags.publisherEnabled ? 'publisher' : summary.roleFlags.creatorEnabled ? 'creator' : 'publisher');
    const preferredOrder = preferredView === 'publisher'
        ? ['myNotice', 'messages', 'creatorCard', 'myApplication']
        : ['myApplication', 'messages', 'creatorCard', 'myNotice'];
    const priorityActions = preferredOrder
        .map((key) => decorated.find((item) => item.key === key))
        .filter((item) => !!item)
        .slice(0, 3);
    const pickedKeys = new Set(priorityActions.map((item) => item.key));
    const secondaryActions = decorated.filter((item) => !pickedKeys.has(item.key));
    return {
        priorityActions,
        secondaryActions,
    };
}
function buildNextStep(summary) {
    if (summary.preferredView === 'publisher') {
        return {
            title: '当前优先处理发布方动作',
            copy: '先从通告管理和消息继续推进，再回头补达人侧资料或报名动作，避免双角色入口一起抢首屏注意力。',
        };
    }
    if (summary.preferredView === 'creator') {
        return {
            title: '当前优先处理达人侧动作',
            copy: '先从我的报名和消息继续推进，再回头维护发布方资料，避免双角色入口同时展开造成决策压力。',
        };
    }
    return {
        title: '先选一个当前主视角',
        copy: '如果你同时具备发布方和达人能力，先在上方切一个当前优先视角，再按下面的入口继续推进。',
    };
}
Page({
    data: {
        topInset: 0,
        pageState: page_state_1.PAGE_STATUS.loading,
        errorText: '',
        summary: null,
        stats: [],
        roleCards: [],
        priorityActions: [],
        secondaryActions: [],
        supportActions: [
            {
                key: 'report',
                label: '举报反馈',
                route: routes_1.ROUTES.mineReport,
                badgeText: '提交',
                hint: '异常信息、欺诈或骚扰都从这里进入处理队列。',
            },
            {
                key: 'reportRecords',
                label: '举报记录',
                route: routes_1.ROUTES.mineReportRecords,
                badgeText: '查看',
                hint: '查看本人举报的处理状态与结论摘要。',
            },
            {
                key: 'feedback',
                label: '意见反馈',
                route: routes_1.ROUTES.mineFeedback,
                badgeText: '提交',
                hint: '功能建议、Bug 和体验吐槽都走这里。',
            },
            {
                key: 'rules',
                label: '规则说明',
                route: routes_1.ROUTES.mineRules,
                badgeText: '查看',
                hint: '平台规则、处罚说明和合作边界统一看这里。',
            },
        ],
        roleSummaryText: '',
        identityCopy: '',
        canSwitchView: false,
        nextStepTitle: '',
        nextStepCopy: '',
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
            const summary = await (0, user_service_1.mine)();
            const roleCount = Number(summary.roleFlags.publisherEnabled) + Number(summary.roleFlags.creatorEnabled);
            const roleSummaryText = summary.isTourist ? '游客态' : roleCount > 1 ? '双角色态' : '单角色态';
            const identityCopy = summary.isTourist
                ? 'V1 不做注册页。入口不隐藏，但会告诉你完成哪类资料后可以继续动作。'
                : roleCount > 1
                    ? summary.preferredView
                        ? '发布方资料和达人名片都已建立，可在这里继续维护。'
                        : '发布方资料和达人名片都已建立，当前优先视角未设置，可在下方手动选择。'
                    : summary.roleFlags.publisherEnabled
                        ? '当前已具备发布方能力，可继续维护资料并查看报名。'
                        : '当前已具备达人能力，可继续维护名片并跟进报名进展。';
            const formattedSummary = {
                ...summary,
                preferredViewLabel: (0, formatter_1.formatPreferredView)(summary.preferredView),
            };
            const { priorityActions, secondaryActions } = buildActionGroups(summary);
            const nextStep = buildNextStep(summary);
            this.setData({
                summary: formattedSummary,
                stats: [
                    {
                        label: '我的通告',
                        value: summary.publisherSummary.noticeCount,
                    },
                    {
                        label: '我的报名',
                        value: summary.creatorSummary.applicationCount,
                    },
                    {
                        label: '未读消息',
                        value: summary.messageSummary.unreadCount,
                    },
                ],
                roleCards: buildRoleCards(summary),
                priorityActions,
                secondaryActions,
                roleSummaryText,
                identityCopy,
                canSwitchView: roleCount > 1,
                nextStepTitle: nextStep.title,
                nextStepCopy: nextStep.copy,
                pageState: page_state_1.PAGE_STATUS.ready,
            });
        }
        catch (error) {
            this.setData({
                pageState: page_state_1.PAGE_STATUS.error,
                errorText: error instanceof Error ? error.message : '我的页初始化失败',
            });
        }
    },
    async onToggleView(event) {
        const value = `${event.currentTarget.dataset.value}`;
        if (!this.data.summary || this.data.summary.preferredView === value) {
            return;
        }
        await (0, user_service_1.setPreferredView)(value);
        (0, user_store_1.setPreferredViewInStore)(value);
        this.loadPage();
    },
    onTapQuickAction(event) {
        const lockedValue = event.currentTarget.dataset.locked;
        const item = {
            key: `${event.currentTarget.dataset.key || ''}`,
            route: `${event.currentTarget.dataset.route || ''}`,
            locked: lockedValue === 1 || lockedValue === '1' || lockedValue === true,
            lockedReason: `${event.currentTarget.dataset.lockedReason || ''}`,
        };
        if (item.locked) {
            wx.showToast({
                title: item.lockedReason || '请先完善资料',
                icon: 'none',
            });
            if (item.key === 'myApplication') {
                (0, router_1.navigateByRoute)('/packages/creator/creator-card/index');
                return;
            }
            if (item.key === 'myNotice') {
                (0, router_1.navigateByRoute)('/pages/publish/index');
            }
            return;
        }
        (0, router_1.navigateByRoute)(item.route);
    },
    onTapSupportAction(event) {
        (0, router_1.navigateByRoute)(`${event.currentTarget.dataset.route || ''}`);
    },
});
