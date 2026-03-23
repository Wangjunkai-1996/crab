import { ROUTES } from '../../../constants/routes';
import { uiStore } from '../../../stores/ui.store';
import { navigateByRoute } from '../../../utils/router';

Page({
  data: {
    topInset: 0,
    bottomInset: 0,
    noticeId: '',
  },

  onLoad(query: Record<string, string>) {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
      bottomInset: uiStore.getState().safeArea.bottomInset,
      noticeId: query.noticeId || '',
    });
  },

  onPrimaryAction() {
    navigateByRoute(ROUTES.publishNoticeList);
  },

  onSecondaryAction() {
    navigateByRoute(ROUTES.plaza);
  },
});
