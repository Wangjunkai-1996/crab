import { ROUTES } from '../../constants/routes';
import { formatPreferredView } from '../../utils/formatter';
import type { MineSummaryResponse } from '../../models/user';
import { mine, setPreferredView } from '../../services/user.service';
import { ensureBootstrapReady } from '../../services/bootstrap.service';
import { setPreferredViewInStore } from '../../stores/user.store';
import { uiStore } from '../../stores/ui.store';
import { PAGE_STATUS } from '../../utils/page-state';
import { navigateByRoute } from '../../utils/router';

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    errorText: '',
    summary: null as (MineSummaryResponse & { preferredViewLabel?: string }) | null,
    stats: [] as Array<{ label: string; value: number }>,
    supportActions: [
      {
        key: 'report',
        label: '举报反馈',
        route: ROUTES.mineReport,
        badgeText: '提交',
        hint: '异常信息、欺诈或骚扰都从这里进入处理队列。',
      },
      {
        key: 'reportRecords',
        label: '举报记录',
        route: ROUTES.mineReportRecords,
        badgeText: '查看',
        hint: '查看本人举报的处理状态与结论摘要。',
      },
      {
        key: 'feedback',
        label: '意见反馈',
        route: ROUTES.mineFeedback,
        badgeText: '提交',
        hint: '功能建议、Bug 和体验吐槽都走这里。',
      },
      {
        key: 'rules',
        label: '规则说明',
        route: ROUTES.mineRules,
        badgeText: '查看',
        hint: '平台规则、处罚说明和合作边界统一看这里。',
      },
    ],
    roleSummaryText: '',
    identityCopy: '',
    canSwitchView: false,
  },

  onLoad() {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
    });
    this.loadPage();
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
    });

    try {
      await ensureBootstrapReady();
      const summary = await mine();
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

      this.setData({
        summary: {
          ...summary,
          preferredViewLabel: formatPreferredView(summary.preferredView),
        },
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
        roleSummaryText,
        identityCopy,
        canSwitchView: roleCount > 1,
        pageState: PAGE_STATUS.ready,
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '我的页初始化失败',
      });
    }
  },

  async onToggleView(event: WechatMiniprogram.TouchEvent) {
    const value = `${event.currentTarget.dataset.value}` as 'publisher' | 'creator';
    if (!this.data.summary || this.data.summary.preferredView === value) {
      return;
    }

    await setPreferredView(value);
    setPreferredViewInStore(value);
    this.loadPage();
  },

  onTapQuickAction(event: WechatMiniprogram.TouchEvent) {
    const lockedValue = event.currentTarget.dataset.locked;
    const item = {
      key: `${event.currentTarget.dataset.key || ''}`,
      route: `${event.currentTarget.dataset.route || ''}`,
      locked: lockedValue === 1 || lockedValue === '1' || lockedValue === true,
      lockedReason: `${event.currentTarget.dataset.lockedReason || ''}`,
    } as MineSummaryResponse['quickActions'][number];

    if (item.locked) {
      wx.showToast({
        title: item.lockedReason || '请先完善资料',
        icon: 'none',
      });

      if (item.key === 'myApplication') {
        navigateByRoute('/packages/creator/creator-card/index');
        return;
      }

      if (item.key === 'myNotice') {
        navigateByRoute('/pages/publish/index');
      }

      return;
    }

    navigateByRoute(item.route);
  },

  onTapSupportAction(event: WechatMiniprogram.TouchEvent) {
    navigateByRoute(`${event.currentTarget.dataset.route || ''}`);
  },
});
