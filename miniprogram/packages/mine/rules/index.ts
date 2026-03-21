import { uiStore } from '../../../stores/ui.store';

Page({
  data: {
    topInset: 0,
  },

  onLoad() {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
    });
  },
});
