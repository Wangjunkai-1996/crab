import type { ApplicationSubmitPayload, ApplicationSubmitResponse, ApplicationWithdrawResponse } from '../models/application';
import type { CreatorCardResponse, CreatorCardUpsertPayload, CreatorCardUpsertResponse, PublisherProfileResponse, PublisherProfileUpsertPayload, PublisherProfileUpsertResponse } from '../models/user';
import { withdraw, submit } from './application.service';
import { getCard, upsertCard } from './creator.service';
import { detail as getNoticeDetail, list as listNotices } from './notice.service';
import { getProfile, upsertProfile } from './publisher.service';
import { clearRequestDebugRecords, getRequestDebugRecords, setRequestDebugEnabled } from '../utils/request-debug';
import { RequestError } from '../utils/request';

const FIXED_DEV_NOTICE_ID = 'notice_202603160001';
const MAX_PREVIEW_LENGTH = 600;

const PUBLISHER_PROFILE_SAMPLE_PAYLOAD: PublisherProfileUpsertPayload = {
  identityType: 'merchant',
  displayName: '蟹宝品牌店',
  city: '上海',
  contactType: 'wechat',
  contactValue: 'crab_brand_ops',
  intro: '本地生活餐饮品牌，常规合作以到店探店为主',
};

const CREATOR_CARD_SAMPLE_PAYLOAD: CreatorCardUpsertPayload = {
  nickname: '阿柚探店',
  city: '上海',
  gender: 'female',
  primaryPlatform: 'xiaohongshu',
  primaryCategory: 'food_beverage',
  followerBand: '5k_10k',
  accountName: '阿柚探店日记',
  accountIdOrLink: 'xiaohongshu://user/creator_2001',
  portfolioImages: ['cloud://domi-dev/creator-portfolio/creator_2001/work-1.jpg'],
  caseDescription: '近 3 个月完成多条本地生活探店合作',
  residentCity: '上海',
  contactType: 'wechat',
  contactValue: 'creator_contact_2001',
};

const APPLICATION_SAMPLE_BASE_PAYLOAD = {
  selfIntroduction: '擅长本地生活探店短视频与图文内容制作。',
  deliverablePlan: '可在到店后 48 小时内交付 1 条短视频和 1 条图文笔记。',
  expectedTerms: '希望支持工作日白天拍摄。',
  portfolioImages: ['cloud://domi-dev/creator-portfolio/creator_2001/work-1.jpg'],
  contactType: 'wechat',
  contactValue: 'creator_contact_2001',
} satisfies Omit<ApplicationSubmitPayload, 'noticeId'>;

interface DevSmokeState {
  latestResolvedNoticeId: string;
  latestSubmittedApplicationId: string;
  latestWithdrawnApplicationId: string;
  lastBatchAt: number;
  lastBatchOk: boolean;
  lastBatchSteps: DevSmokeStepResult[];
}

interface NoticeCandidateInspection {
  noticeId: string;
  source: 'explicit' | 'fixed' | 'list';
  ok: boolean;
  reason: string;
  ctaAction?: string;
}

interface StepExecutionConfig<T> {
  step: string;
  functionName: string;
  actionName: string;
  payload: unknown;
  run: () => Promise<T>;
}

interface StepExecutionResult<T> {
  data?: T;
  result: DevSmokeStepResult;
}

const smokeState: DevSmokeState = {
  latestResolvedNoticeId: '',
  latestSubmittedApplicationId: '',
  latestWithdrawnApplicationId: '',
  lastBatchAt: 0,
  lastBatchOk: false,
  lastBatchSteps: [],
};

function resetSmokeState() {
  smokeState.latestResolvedNoticeId = '';
  smokeState.latestSubmittedApplicationId = '';
  smokeState.latestWithdrawnApplicationId = '';
  smokeState.lastBatchAt = 0;
  smokeState.lastBatchOk = false;
  smokeState.lastBatchSteps = [];
}

function serializePreview(input: unknown, maxLength = MAX_PREVIEW_LENGTH) {
  try {
    const text = JSON.stringify(input);

    if (!text) {
      return '';
    }

    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  } catch (error) {
    return '[unserializable]';
  }
}

function buildErrorPreview(error: unknown) {
  if (error instanceof RequestError) {
    return serializePreview({
      name: error.name,
      code: error.code,
      message: error.message,
      requestId: error.requestId,
      fieldErrors: error.fieldErrors,
      missingFieldKeys: error.missingFieldKeys,
      errorType: error.errorType,
    });
  }

  if (error instanceof Error) {
    return serializePreview({
      name: error.name,
      message: error.message,
    });
  }

  return serializePreview({
    message: 'unknown_error',
  });
}

function buildStepResult(params: {
  step: string;
  ok: boolean;
  action: string;
  message: string;
  requestId?: string;
  payload?: unknown;
  response?: unknown;
}) {
  return {
    step: params.step,
    ok: params.ok,
    action: params.action,
    requestId: params.requestId || '',
    message: params.message,
    payloadPreview: serializePreview(params.payload),
    responsePreview: serializePreview(params.response),
  } satisfies DevSmokeStepResult;
}

function getRequestRecord(functionName: string, actionName: string, startedAt: number) {
  return getRequestDebugRecords().find(
    (record) => record.functionName === functionName && record.action === actionName && record.timestamp >= startedAt - 50,
  );
}

async function executeStep<T>(config: StepExecutionConfig<T>): Promise<StepExecutionResult<T>> {
  const startedAt = Date.now();

  try {
    const data = await config.run();
    const requestRecord = getRequestRecord(config.functionName, config.actionName, startedAt);

    return {
      data,
      result: {
        step: config.step,
        ok: true,
        action: `${config.functionName}.${config.actionName}`,
        requestId: requestRecord?.requestId || '',
        message: requestRecord?.message || 'ok',
        payloadPreview: requestRecord?.payloadPreview || serializePreview(config.payload),
        responsePreview: requestRecord?.responsePreview || serializePreview(data),
      },
    };
  } catch (error) {
    const requestRecord = getRequestRecord(config.functionName, config.actionName, startedAt);

    return {
      result: {
        step: config.step,
        ok: false,
        action: `${config.functionName}.${config.actionName}`,
        requestId: error instanceof RequestError ? error.requestId : requestRecord?.requestId || '',
        message: error instanceof Error ? error.message : 'unknown_error',
        payloadPreview: requestRecord?.payloadPreview || serializePreview(config.payload),
        responsePreview: requestRecord?.responsePreview || buildErrorPreview(error),
      },
    };
  }
}

async function inspectNoticeCandidate(noticeId: string, source: NoticeCandidateInspection['source']) {
  try {
    const detail = await getNoticeDetail(noticeId);
    const canApply = detail.permissionState.canApply && !detail.permissionState.isOwner && detail.ctaState.primaryAction === 'apply';

    return {
      noticeId,
      source,
      ok: canApply,
      reason:
        detail.ctaState.disabledReason ||
        detail.ctaState.primaryText ||
        `canApply=${detail.permissionState.canApply},hasApplied=${detail.permissionState.hasApplied},isOwner=${detail.permissionState.isOwner}`,
      ctaAction: detail.ctaState.primaryAction,
    } satisfies NoticeCandidateInspection;
  } catch (error) {
    return {
      noticeId,
      source,
      ok: false,
      reason: error instanceof Error ? error.message : 'notice_detail_failed',
    } satisfies NoticeCandidateInspection;
  }
}

async function resolveApplyableNotice(noticeId?: string) {
  const candidateIds: Array<{ noticeId: string; source: NoticeCandidateInspection['source'] }> = [];
  const inspected: NoticeCandidateInspection[] = [];
  const seenNoticeIds = new Set<string>();

  function pushCandidate(targetNoticeId: string | undefined, source: NoticeCandidateInspection['source']) {
    if (!targetNoticeId || seenNoticeIds.has(targetNoticeId)) {
      return;
    }

    seenNoticeIds.add(targetNoticeId);
    candidateIds.push({
      noticeId: targetNoticeId,
      source,
    });
  }

  pushCandidate(noticeId, 'explicit');
  pushCandidate(FIXED_DEV_NOTICE_ID, 'fixed');

  try {
    const noticeList = await listNotices({});
    noticeList.list.slice(0, 8).forEach((item) => {
      pushCandidate(item.noticeId, 'list');
    });
  } catch (error) {
    inspected.push({
      noticeId: '',
      source: 'list',
      ok: false,
      reason: error instanceof Error ? `notice_list_failed:${error.message}` : 'notice_list_failed',
    });
  }

  for (const candidate of candidateIds) {
    const result = await inspectNoticeCandidate(candidate.noticeId, candidate.source);
    inspected.push(result);

    if (result.ok) {
      return {
        ok: true,
        noticeId: result.noticeId,
        inspected,
      };
    }
  }

  return {
    ok: false,
    noticeId: '',
    inspected,
  };
}

function buildApplicationPayload(noticeId: string): ApplicationSubmitPayload {
  return {
    noticeId,
    ...APPLICATION_SAMPLE_BASE_PAYLOAD,
  };
}

export function createDevSmokeHelper(getRuntimeSummary: () => RuntimeDebugSummary) {
  function buildSummary(): DevSmokeSummary {
    return {
      runtime: getRuntimeSummary(),
      requestLogCount: getRequestDebugRecords().length,
      fixedNoticeId: FIXED_DEV_NOTICE_ID,
      latestResolvedNoticeId: smokeState.latestResolvedNoticeId,
      latestSubmittedApplicationId: smokeState.latestSubmittedApplicationId,
      latestWithdrawnApplicationId: smokeState.latestWithdrawnApplicationId,
      lastBatchAt: smokeState.lastBatchAt,
      lastBatchOk: smokeState.lastBatchOk,
      lastBatchSteps: [...smokeState.lastBatchSteps],
    };
  }

  function prepare() {
    const app = getApp<IAppOption>();

    setRequestDebugEnabled(true);
    clearRequestDebugRecords();
    resetSmokeState();
    app.globalData.requestDebug.enabled = true;

    return buildSummary();
  }

  async function rerunBootstrapStep() {
    return executeStep({
      step: 'bootstrap',
      functionName: 'user-bff',
      actionName: 'bootstrap',
      payload: {},
      run: async () => {
        await getApp<IAppOption>().bootstrapApp(true);
        return buildSummary().runtime;
      },
    });
  }

  async function readPublisherProfile() {
    const execution = await executeStep<PublisherProfileResponse>({
      step: 'publisher.read',
      functionName: 'publisher-bff',
      actionName: 'getProfile',
      payload: {},
      run: () => getProfile(),
    });

    return execution.result;
  }

  async function upsertPublisherProfileStep() {
    const execution = await executeStep<PublisherProfileUpsertResponse>({
      step: 'publisher.write',
      functionName: 'publisher-bff',
      actionName: 'upsertProfile',
      payload: PUBLISHER_PROFILE_SAMPLE_PAYLOAD,
      run: () => upsertProfile(PUBLISHER_PROFILE_SAMPLE_PAYLOAD),
    });

    return execution.result;
  }

  async function readCreatorCard() {
    const execution = await executeStep<CreatorCardResponse>({
      step: 'creator.read',
      functionName: 'creator-bff',
      actionName: 'getCard',
      payload: {},
      run: () => getCard(),
    });

    return execution.result;
  }

  async function upsertCreatorCardStep() {
    const execution = await executeStep<CreatorCardUpsertResponse>({
      step: 'creator.write',
      functionName: 'creator-bff',
      actionName: 'upsertCard',
      payload: CREATOR_CARD_SAMPLE_PAYLOAD,
      run: () => upsertCard(CREATOR_CARD_SAMPLE_PAYLOAD),
    });

    return execution.result;
  }

  async function submitApplicationStep(noticeId?: string) {
    const resolvedNotice = await resolveApplyableNotice(noticeId);

    if (!resolvedNotice.ok || !resolvedNotice.noticeId) {
      return buildStepResult({
        step: 'application.submit',
        ok: false,
        action: 'application-bff.submit',
        message: 'no_applyable_notice',
        payload: {
          requestedNoticeId: noticeId || '',
          fixedNoticeId: FIXED_DEV_NOTICE_ID,
        },
        response: {
          inspected: resolvedNotice.inspected,
        },
      });
    }

    smokeState.latestResolvedNoticeId = resolvedNotice.noticeId;
    smokeState.latestSubmittedApplicationId = '';
    const submitPayload = buildApplicationPayload(resolvedNotice.noticeId);
    const execution = await executeStep<ApplicationSubmitResponse>({
      step: 'application.submit',
      functionName: 'application-bff',
      actionName: 'submit',
      payload: submitPayload,
      run: () => submit(submitPayload),
    });

    if (execution.result.ok && execution.data?.applicationId) {
      smokeState.latestSubmittedApplicationId = execution.data.applicationId;
    }

    return execution.result;
  }

  async function withdrawLatestApplicationStep() {
    if (!smokeState.latestSubmittedApplicationId) {
      return buildStepResult({
        step: 'application.withdraw',
        ok: true,
        action: 'application-bff.withdraw',
        message: 'skipped:no_current_session_application',
        payload: {},
        response: {
          latestSubmittedApplicationId: '',
        },
      });
    }

    const applicationId = smokeState.latestSubmittedApplicationId;
    const execution = await executeStep<ApplicationWithdrawResponse>({
      step: 'application.withdraw',
      functionName: 'application-bff',
      actionName: 'withdraw',
      payload: {
        applicationId,
      },
      run: () => withdraw(applicationId),
    });

    if (execution.result.ok) {
      smokeState.latestWithdrawnApplicationId = applicationId;
    }

    return execution.result;
  }

  async function runFirstBatch(): Promise<DevSmokeBatchRun> {
    const startedAt = Date.now();
    const steps: DevSmokeStepResult[] = [];

    prepare();

    const bootstrap = await rerunBootstrapStep();
    steps.push(bootstrap.result);

    if (bootstrap.result.ok) {
      const publisherRead = await readPublisherProfile();
      steps.push(publisherRead);
    }

    if (steps.every((item) => item.ok)) {
      const publisherWrite = await upsertPublisherProfileStep();
      steps.push(publisherWrite);
    }

    if (steps.every((item) => item.ok)) {
      const creatorRead = await readCreatorCard();
      steps.push(creatorRead);
    }

    if (steps.every((item) => item.ok)) {
      const creatorWrite = await upsertCreatorCardStep();
      steps.push(creatorWrite);
    }

    if (steps.every((item) => item.ok)) {
      const submitResult = await submitApplicationStep();
      steps.push(submitResult);
    }

    if (steps.every((item) => item.ok)) {
      const withdrawResult = await withdrawLatestApplicationStep();
      steps.push(withdrawResult);
    }

    const finishedAt = Date.now();
    const ok = steps.every((item) => item.ok);

    smokeState.lastBatchAt = finishedAt;
    smokeState.lastBatchOk = ok;
    smokeState.lastBatchSteps = [...steps];

    return {
      ...buildSummary(),
      ok,
      startedAt,
      finishedAt,
      steps,
      requestLogs: getRequestDebugRecords(),
    };
  }

  return {
    prepare,
    getSummary: buildSummary,
    readPublisherProfile,
    upsertPublisherProfile: upsertPublisherProfileStep,
    readCreatorCard,
    upsertCreatorCard: upsertCreatorCardStep,
    submitApplication: submitApplicationStep,
    withdrawLatestApplication: withdrawLatestApplicationStep,
    runFirstBatch,
  };
}
