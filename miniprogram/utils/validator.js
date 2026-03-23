"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasRequiredValues = hasRequiredValues;
exports.collectFieldErrors = collectFieldErrors;
function hasRequiredValues(fields) {
    return fields.every((field) => `${field ?? ''}`.trim().length > 0);
}
function collectFieldErrors(requiredFields) {
    return Object.keys(requiredFields).reduce((result, key) => {
        if (!requiredFields[key]) {
            result[key] = '该字段不能为空';
        }
        return result;
    }, {});
}
