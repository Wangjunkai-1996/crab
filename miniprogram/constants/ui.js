"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WAIT_CONFIRMATIONS = exports.RUNTIME_MODE_LABELS = exports.PREFERRED_VIEW_OPTIONS = exports.MY_APPLICATION_STATUS_TABS = exports.MY_NOTICE_STATUS_TABS = exports.MESSAGE_TYPE_TABS = exports.USE_MOCK_ADAPTER = exports.DEFAULT_API_MODE = exports.DEFAULT_CLOUD_ENV_ID = exports.DEFAULT_PAGE_SIZE = exports.CLIENT_SOURCE = exports.APP_VERSION = exports.APP_NAME = void 0;
exports.APP_NAME = '多米通告';
exports.APP_VERSION = '1.0.0';
exports.CLIENT_SOURCE = 'miniprogram';
exports.DEFAULT_PAGE_SIZE = 10;
exports.DEFAULT_CLOUD_ENV_ID = 'cloud1-4grxqg018586792d';
exports.DEFAULT_API_MODE = 'mock';
exports.USE_MOCK_ADAPTER = exports.DEFAULT_API_MODE === 'mock';
exports.MESSAGE_TYPE_TABS = [
    { label: '全部', value: 'all' },
    { label: '审核', value: 'review' },
    { label: '报名', value: 'application' },
    { label: '系统', value: 'system' },
];
exports.MY_NOTICE_STATUS_TABS = [
    { label: '全部', value: 'all' },
    { label: '待审核', value: 'pending_review' },
    { label: '进行中', value: 'active' },
    { label: '已关闭', value: 'closed' },
];
exports.MY_APPLICATION_STATUS_TABS = [
    { label: '全部', value: 'all' },
    { label: '已查看', value: 'viewed' },
    { label: '待联系', value: 'contact_pending' },
    { label: '已沟通', value: 'communicating' },
    { label: '未入选', value: 'rejected' },
];
exports.PREFERRED_VIEW_OPTIONS = [
    { label: '发布方', value: 'publisher' },
    { label: '达人', value: 'creator' },
];
exports.RUNTIME_MODE_LABELS = {
    mock: 'Mock 联调中',
    cloud: '云函数联调',
};
exports.WAIT_CONFIRMATIONS = [
    '城市筛选的候选项与默认城市来源在 V1 文档中未明确，当前仅保留字段与缓存位，不内置城市枚举。',
];
