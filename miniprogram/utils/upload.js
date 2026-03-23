"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
const ui_1 = require("../constants/ui");
async function uploadFile(filePath, cloudPath) {
    if (ui_1.USE_MOCK_ADAPTER) {
        return {
            fileID: `mock://${cloudPath}`,
            tempFilePath: filePath,
        };
    }
    const result = await wx.cloud.uploadFile({
        cloudPath,
        filePath,
    });
    return {
        fileID: result.fileID,
        tempFilePath: filePath,
    };
}
