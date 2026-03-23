import { ensureBootstrapReady } from '../../../services/bootstrap.service';
import { myList } from '../../../services/report.service';
import { uiStore } from '../../../stores/ui.store';
import { formatReportReason, formatReportTargetType } from '../../../utils/formatter';
import { PAGE_STATUS } from '../../../utils/page-state';

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

function decorate(list: ReportRecordItem[]) {
  return list.map((item) => ({
    ...item,
    targetTypeLabel: formatReportTargetType(item.targetType),
    reasonLabel: formatReportReason(item.reasonCode),
    statusBucket: getStatusBucket(item.status),
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
    rawList: [] as Array<ReportRecordItem & { targetTypeLabel?: string; reasonLabel?: string; statusBucket?: string }>,
    list: [] as Array<ReportRecordItem & { targetTypeLabel?: string; reasonLabel?: string; statusBucket?: string }>,
    latestRecord: null as (ReportRecordItem & { targetTypeLabel?: string; reasonLabel?: string; statusBucket?: string }) | null,
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

    this.setData({
      list: nextList,
      latestRecord: rawList[0] || null,
      pageState: nextList.length ? PAGE_STATUS.ready : PAGE_STATUS.empty,
    });
  },

  async loadPage() {
    this.setData({
      pageState: PAGE_STATUS.loading,
      errorText: '',
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
});
