export const APP_NAME = '多米通告';
export const APP_VERSION = '1.0.0';
export const CLIENT_SOURCE = 'miniprogram';
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_CLOUD_ENV_ID = 'cloud1-4grxqg018586792d';
export const DEFAULT_API_MODE = 'mock' as const;
export const USE_MOCK_ADAPTER = DEFAULT_API_MODE === 'mock';

export const MESSAGE_TYPE_TABS = [
  { label: '全部', value: 'all' },
  { label: '审核', value: 'review' },
  { label: '报名', value: 'application' },
  { label: '系统', value: 'system' },
];

export const MY_NOTICE_STATUS_TABS = [
  { label: '全部', value: 'all' },
  { label: '待审核', value: 'pending_review' },
  { label: '进行中', value: 'active' },
  { label: '已关闭', value: 'closed' },
];

export const MY_APPLICATION_STATUS_TABS = [
  { label: '全部', value: 'all' },
  { label: '已查看', value: 'viewed' },
  { label: '待联系', value: 'contact_pending' },
  { label: '已沟通', value: 'communicating' },
  { label: '未入选', value: 'rejected' },
];

export const PREFERRED_VIEW_OPTIONS = [
  { label: '发布方', value: 'publisher' },
  { label: '达人', value: 'creator' },
];

export const RUNTIME_MODE_LABELS = {
  mock: 'Mock 联调中',
  cloud: '云函数联调',
} as const;

export const WAIT_CONFIRMATIONS = [
  '城市筛选的候选项与默认城市来源在 V1 文档中未明确，当前仅保留字段与缓存位，不内置城市枚举。',
];
