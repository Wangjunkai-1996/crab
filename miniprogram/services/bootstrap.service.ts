import { WAIT_CONFIRMATIONS } from '../constants/ui';
import { getRuntimeMode, initCloud } from './cloud';
import { getCloudEnvId, type ApiMode, persistRuntimeConfig, type RuntimeSwitchState, resolveRuntimeDescription } from './runtime-config';
import { bootstrap as requestBootstrap } from './user.service';
import { hydrateUserStore, setUnreadCount } from '../stores/user.store';
import { setSafeAreaInfo } from '../stores/ui.store';
import { getSafeAreaInfo } from '../utils/safe-area';

export interface BootstrapRuntimeSnapshot {
  runtimeMode: ApiMode;
  runtimeSwitchState: RuntimeSwitchState;
  pendingConfirmations: string[];
  runtimeDescription: string;
}

export function prepareBootstrapRuntime(): BootstrapRuntimeSnapshot {
  const runtimeSwitchState = initCloud();
  setSafeAreaInfo(getSafeAreaInfo());

  return {
    runtimeMode: getRuntimeMode(),
    runtimeSwitchState,
    pendingConfirmations: WAIT_CONFIRMATIONS,
    runtimeDescription: resolveRuntimeDescription(runtimeSwitchState),
  };
}

export async function performBootstrapRequest() {
  const result = await requestBootstrap();

  hydrateUserStore({
    userId: result.user.userId,
    roleFlags: result.user.roleFlags,
    accountStatus: result.user.accountStatus,
    preferredView: result.user.preferredView,
  });
  setUnreadCount(result.message.unreadCount);

  return result;
}

export function ensureBootstrapReady(force = false) {
  const app = getApp<IAppOption>();

  if (force || app.globalData.bootstrapError) {
    return app.bootstrapApp(true);
  }

  return app.globalData.bootstrapPromise;
}

export async function switchBootstrapRuntime(mode: ApiMode, cloudEnvId = getCloudEnvId()) {
  persistRuntimeConfig(mode, cloudEnvId);

  const app = getApp<IAppOption>();
  const snapshot = prepareBootstrapRuntime();

  app.globalData.runtimeMode = snapshot.runtimeMode;
  app.globalData.runtimeSwitchState = snapshot.runtimeSwitchState;
  app.globalData.pendingConfirmations = snapshot.pendingConfirmations;

  await app.bootstrapApp(true);

  return snapshot.runtimeSwitchState;
}
