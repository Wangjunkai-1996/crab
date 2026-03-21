import { ROUTES } from '../../constants/routes';
import { MESSAGE_TYPE_TABS } from '../../constants/ui';
import type { MessageItem } from '../../models/message';
import { list as getMessages, markAllRead, markRead } from '../../services/message.service';
import { ensureBootstrapReady } from '../../services/bootstrap.service';
import { setUnreadCount } from '../../stores/user.store';
import { uiStore } from '../../stores/ui.store';
import { PAGE_STATUS } from '../../utils/page-state';
import { navigateByRoute } from '../../utils/router';

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    tabs: MESSAGE_TYPE_TABS,
    activeType: 'all',
    messages: [] as MessageItem[],
    unreadCount: 0,
    emptyTitle: '当前分类暂无消息',
    emptyDescription: '先回到广场或发布页继续操作，相关通知会自动进入这里。',
    errorText: '',
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
      const result = await getMessages(this.data.activeType);
      setUnreadCount(result.unreadCount);
      this.setData({
        messages: result.list,
        unreadCount: result.unreadCount,
        pageState: result.list.length ? PAGE_STATUS.ready : PAGE_STATUS.empty,
        emptyTitle: this.data.activeType === 'all' ? '当前暂无消息' : '当前分类暂无消息',
        emptyDescription: this.data.activeType === 'all' ? '后续审核通知、报名进展和系统提醒都会汇总到这里。' : '切回“全部”或继续操作后，相关通知会自动进入这里。',
      });
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '消息列表加载失败',
      });
    }
  },

  onSwitchTab(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      activeType: `${event.currentTarget.dataset.value}`,
    });
    this.loadPage();
  },

  async onTapMessage(event: WechatMiniprogram.CustomEvent<MessageItem>) {
    const message = event.detail;

    if (!message.isRead) {
      await markRead(message.messageId);
      this.loadPage();
    }

    if (message.relatedObjectType === 'notice' && message.relatedObjectId) {
      navigateByRoute(`/pages/plaza/notice-detail?noticeId=${message.relatedObjectId}`);
      return;
    }

    if (message.relatedObjectType === 'application') {
      navigateByRoute(ROUTES.creatorApplicationList);
    }
  },

  async onMarkAllRead() {
    await markAllRead();
    this.loadPage();
  },
});
