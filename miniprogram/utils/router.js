"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigateByRoute = navigateByRoute;
const routes_1 = require("../constants/routes");
const TAB_ROUTES = [routes_1.ROUTES.plaza, routes_1.ROUTES.publish, routes_1.ROUTES.messages, routes_1.ROUTES.mine];
function navigateByRoute(route) {
    if (TAB_ROUTES.includes(route)) {
        return wx.switchTab({
            url: route,
        });
    }
    return wx.navigateTo({
        url: route,
    });
}
