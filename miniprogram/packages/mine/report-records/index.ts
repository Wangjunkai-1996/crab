import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { myList } from '../../../services/report.service';
import { uiStore } from '../../../stores/ui.store';
import { formatReportReason, formatReportTargetType } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';
import { navigateByRoute } from '../../../utils/router';

interface ReportRecordItem {
  reportId: string;
  targetType: string;
  targetId?: string;
  reasonCode: string;
  status: string;
  resultAction?: string;
}

function getStatusBucket(status: string) {
  if (status.includes('处理中') || status.includes('待')) {
    return 'processing';
  }

  if (status.includes('未成立')) {
    return 'invalid';
  }

  return 'handled';
}

function getNextActionText(item: ReportRecordItem & { statusBucket?: string }) {
  if (item.statusBucket === 'processing') {
    return '平台已接收举报，当前重点是等待处理结论或补充材料通知。';
  }

  if (item.statusBucket === 'invalid') {
    return '当前结果为未成立，建议优先回看处理摘要，确认是否需要补充新的有效证据。';
  }

  return '当前举报已有处理结果，建议优先看处理摘要，再决定是否还要继续反馈。';
}

function buildStats(list: Array<ReportRecordItem & { statusBucket?: string }>) {
  return [
    { label: '全部', value: list.length },
    { label: '处理中', value: list.filter((item) => item.statusBucket === 'processing').length },
    { label: '已处理', value: list.filter((item) => item.statusBucket === 'handled').length },
  ];
}

function decorate(list: ReportRecordItem[]) {
  return list.map((item) => ({
    ...item,
    targetTypeLabel: formatReportTargetType(item.targetType),
    reasonLabel: formatReportReason(item.reasonCode),
    statusBucket: getStatusBucket(item.status),
    nextActionText: getNextActionText({
      ...item,
      statusBucket: getStatusBucket(item.status),
    }),
  }));
}

Page({
  data: {
    topInset: 0,
    pageState: PAGE_STATUS.loading,
    errorText: '',
    activeTab: 'all',
    tabs: [
      { label: '全部', value: 'all' },
      { label: '处理中', value: 'processing' },
      { label: '已处理', value: 'handled' },
      { label: '未成立', value: 'invalid' },
    ],
    rawList: [] as Array<ReportRecordItem & { targetTypeLabel?: string; reasonLabel?: string; statusBucket?: string; nextActionText?: string }>,
    list: [] as Array<ReportRecordItem & { targetTypeLabel?: string; reasonLabel?: string; statusBucket?: string; nextActionText?: string }>,
    latestRecord: null as (ReportRecordItem & { targetTypeLabel?: string; reasonLabel?: string; statusBucket?: string; nextActionText?: string }) | null,
    stats: [] as Array<{ label: string; value: number }>,
    filteredEmpty: false,
  },

  onLoad() {
    this.setData({
      topInset: uiStore.getState().safeArea.statusBarHeight,
    });
    this.loadPage();
  },

  applyFilter() {
    const rawList = this.data.rawList || [];
    const activeTab = this.data.activeTab;
    const nextList = activeTab === 'all' ? rawList : rawList.filter((item) => item.statusBucket === activeTab);
    const hasAnyData = rawList.length > 0;

    this.setData({
      list: nextList,
      latestRecord: rawList[0] || null,
      stats: buildStats(rawList),
      filteredEmpty: hasAnyData && nextList.length === 0,
      pageState: hasAnyData ? PAGE_STATUS.ready : PAGE_STATUS.empty,
    });
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
      filteredEmpty: false,
    });

    try {
      await ensureBootstrapReady();
      const result = await myList();
      this.setData({
        rawList: decorate((result.list || []) as ReportRecordItem[]),
      });
      this.applyFilter();
    } catch (error) {
      this.setData({
        pageState: PAGE_STATUS.error,
        errorText: error instanceof Error ? error.message : '举报记录加载失败',
      });
    }
  },

  onSwitchTab(event: WechatMiniprogram.TouchEvent) {
    this.setData({
      activeTab: `${event.currentTarget.dataset.value || 'all'}`,
    });
    this.applyFilter();
  },

  onEmptyAction() {
    navigateByRoute('/packages/mine/report/index');
  },
});
