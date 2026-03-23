import { USE_MOCK_ADAPTER } from '../constants/ui';

export async function uploadFile(filePath: string, cloudPath: string) {
  if (USE_MOCK_ADAPTER) {
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
