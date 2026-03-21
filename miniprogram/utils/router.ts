import { ROUTES } from '../constants/routes';

const TAB_ROUTES = [ROUTES.plaza, ROUTES.publish, ROUTES.messages, ROUTES.mine];

export function navigateByRoute(route: string) {
  if (TAB_ROUTES.includes(route as typeof TAB_ROUTES[number])) {
    return wx.switchTab({
      url: route,
    });
  }

  return wx.navigateTo({
    url: route,
  });
}
