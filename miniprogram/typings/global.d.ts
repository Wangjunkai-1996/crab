declare namespace WechatMiniprogram {
  type AnyRecord = Record<string, any>;
  type CustomEvent<T = any> = any;
  type TouchEvent = any;
}

declare const wx: any;
declare const console: any;
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): number;
declare function App<T>(options: T): void;
declare function Page<T>(options: T): void;
declare function Component<T>(options: T): void;
declare function getApp<T = IAppOption>(): T;
declare function getCurrentPages(): Array<any>;

declare interface RuntimeDebugSummary {
  runtimeMode: 'mock' | 'cloud';
  desiredMode: 'mock' | 'cloud';
  activeMode: 'mock' | 'cloud';
  cloudEnvId: string;
  cloudReady: boolean;
  fallbackReason: 'ready' | 'mock_default' | 'missing_cloud_env' | 'cloud_unavailable';
  runtimeDescription: string;
  pendingConfirmations: string[];
  requestDebugEnabled: boolean;
  requestLogCount: number;
  bootstrapError: string;
}

declare interface RequestDebugRecord {
  timestamp: number;
  functionName: string;
  action: string;
  mode: 'mock' | 'cloud';
  durationMs: number;
  success: boolean;
  code: number;
  message: string;
  requestId: string;
  payloadPreview: string;
  responsePreview: string;
}

declare interface DevSmokeStepResult {
  step: string;
  ok: boolean;
  action: string;
  requestId: string;
  message: string;
  payloadPreview: string;
  responsePreview: string;
}

declare interface DevAutoSmokeStepResult extends DevSmokeStepResult {
  stage: 'runtime' | 'batch' | 'page';
}

declare interface DevSmokeSummary {
  runtime: RuntimeDebugSummary;
  requestLogCount: number;
  fixedNoticeId: string;
  latestResolvedNoticeId: string;
  latestSubmittedApplicationId: string;
  latestWithdrawnApplicationId: string;
  lastBatchAt: number;
  lastBatchOk: boolean;
  lastBatchSteps: DevSmokeStepResult[];
}

declare interface DevSmokeBatchRun extends DevSmokeSummary {
  ok: boolean;
  startedAt: number;
  finishedAt: number;
  steps: DevSmokeStepResult[];
  requestLogs: RequestDebugRecord[];
}

declare interface DevSmokeInventorySamples {
  publisherNoticeId: string;
  creatorApplicationId: string;
  searchKeyword: string;
  errors: Record<string, string>;
}

declare interface DevRuntimeErrorRecord {
  timestamp: number;
  type: 'app_error' | 'unhandled_rejection' | 'page_not_found';
  route: string;
  message: string;
  payloadPreview: string;
}

declare interface DevAutoSmokeLaunchOptions {
  enabled: boolean;
  runtimeMode: 'mock' | 'cloud';
  cloudEnvId: string;
  query: Record<string, string>;
}

declare interface DevAutoSmokePageResult {
  key: string;
  route: string;
  url: string;
  openMode: 'tab' | 'navigate';
  ok: boolean;
  arrived: boolean;
  pageState: string;
  errorText: string;
  message: string;
  durationMs: number;
  runtimeErrorCount: number;
}

declare interface DevAutoSmokePageRun {
  ok: boolean;
  skipped: boolean;
  reason: string;
  pages: DevAutoSmokePageResult[];
}

declare interface DevAutoSmokeResultBundle {
  ok: boolean;
  launchOptions: DevAutoSmokeLaunchOptions;
  runtimeSummary: RuntimeDebugSummary;
  batch: DevSmokeBatchRun | null;
  steps: DevAutoSmokeStepResult[];
  pageSmoke: DevAutoSmokePageRun;
  requestLogs: RequestDebugRecord[];
  runtimeErrors: DevRuntimeErrorRecord[];
  generatedAt: string;
  resultTag: string;
}

declare interface IAppOption {
  onLaunch?: (options?: WechatMiniprogram.AnyRecord) => void;
  onError?: (error: string) => void;
  onUnhandledRejection?: (payload: unknown) => void;
  onPageNotFound?: (payload: unknown) => void;
  globalData: {
    bootstrapPromise: Promise<void>;
    bootstrapError: string;
    runtimeMode: 'mock' | 'cloud';
    runtimeSwitchState: {
      desiredMode: 'mock' | 'cloud';
      activeMode: 'mock' | 'cloud';
      cloudEnvId: string;
      cloudReady: boolean;
      fallbackReason: 'ready' | 'mock_default' | 'missing_cloud_env' | 'cloud_unavailable';
    };
    pendingConfirmations: string[];
    runtimeErrors: DevRuntimeErrorRecord[];
    autoSmokeResult: DevAutoSmokeResultBundle | null;
    requestDebug: {
      enabled: boolean;
      setEnabled: (enabled: boolean) => void;
      clearLogs: () => void;
      getLogs: () => RequestDebugRecord[];
    };
    runtimeDebug: {
      getSummary: () => RuntimeDebugSummary;
      useMock: () => Promise<RuntimeDebugSummary>;
      useCloud: (cloudEnvId?: string) => Promise<RuntimeDebugSummary>;
      clearRequestLogs: () => RuntimeDebugSummary;
      rerunBootstrap: () => Promise<RuntimeDebugSummary>;
    };
    devSmoke: {
      prepare: () => DevSmokeSummary;
      getSummary: () => DevSmokeSummary;
      readPublisherProfile: () => Promise<DevSmokeStepResult>;
      upsertPublisherProfile: () => Promise<DevSmokeStepResult>;
      readCreatorCard: () => Promise<DevSmokeStepResult>;
      upsertCreatorCard: () => Promise<DevSmokeStepResult>;
      submitApplication: (noticeId?: string) => Promise<DevSmokeStepResult>;
      withdrawLatestApplication: () => Promise<DevSmokeStepResult>;
      runFirstBatch: () => Promise<DevSmokeBatchRun>;
      resolveInventorySamples: () => Promise<DevSmokeInventorySamples>;
    };
  };
  bootstrapApp: (force?: boolean) => Promise<void>;
}
