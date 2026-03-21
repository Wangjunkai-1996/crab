"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
exports.mine = mine;
exports.setPreferredView = setPreferredView;
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'user-bff';
function bootstrap() {
    return (0, request_1.request)(FUNCTION_NAME, 'bootstrap');
}
function mine() {
    return (0, request_1.request)(FUNCTION_NAME, 'mine');
}
function setPreferredView(preferredView) {
    return (0, request_1.request)(FUNCTION_NAME, 'setPreferredView', {
        preferredView,
    });
}
