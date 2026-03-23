"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submit = submit;
const request_1 = require("../utils/request");
const FUNCTION_NAME = 'feedback-bff';
function submit(payload) {
    return (0, request_1.request)(FUNCTION_NAME, 'submit', payload);
}
