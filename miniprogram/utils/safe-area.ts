export interface SafeAreaInfo {
  statusBarHeight: number;
  navigationBarHeight: number;
  topInset: number;
  bottomInset: number;
}

export function getSafeAreaInfo(): SafeAreaInfo {
  const systemInfo = wx.getSystemInfoSync();
  const safeArea = systemInfo.safeArea;
  const statusBarHeight = systemInfo.statusBarHeight || 0;
  const bottomInset = safeArea ? Math.max((systemInfo.screenHeight || 0) - safeArea.bottom, 0) : 0;
  const navigationBarHeight = 44;

  return {
    statusBarHeight,
    navigationBarHeight,
    topInset: statusBarHeight + navigationBarHeight,
    bottomInset,
  };
}
