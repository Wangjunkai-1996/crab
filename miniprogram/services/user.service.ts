import type { PreferredView } from '../constants/enums';
import type { BootstrapResponse, MineSummaryResponse } from '../models/user';
import { request } from '../utils/request';

const FUNCTION_NAME = 'user-bff';

export function bootstrap() {
  return request<BootstrapResponse>(FUNCTION_NAME, 'bootstrap');
}

export function mine() {
  return request<MineSummaryResponse>(FUNCTION_NAME, 'mine');
}

export function setPreferredView(preferredView: PreferredView) {
  return request<{ preferredView: PreferredView }, { preferredView: PreferredView }>(FUNCTION_NAME, 'setPreferredView', {
    preferredView,
  });
}
