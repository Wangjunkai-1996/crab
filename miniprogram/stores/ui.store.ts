import type { SafeAreaInfo } from '../utils/safe-area';
import { createStore } from './create-store';

interface UiStoreState {
  safeArea: SafeAreaInfo;
  globalLoading: boolean;
  feedbackMessage: string;
}

const initialState: UiStoreState = {
  safeArea: {
    statusBarHeight: 0,
    navigationBarHeight: 44,
    topInset: 44,
    bottomInset: 0,
  },
  globalLoading: false,
  feedbackMessage: '',
};

export const uiStore = createStore(initialState);

export function setSafeAreaInfo(safeArea: SafeAreaInfo) {
  uiStore.setState({ safeArea });
}

export function setGlobalLoading(globalLoading: boolean) {
  uiStore.setState({ globalLoading });
}

export function setFeedbackMessage(feedbackMessage: string) {
  uiStore.setState({ feedbackMessage });
}
