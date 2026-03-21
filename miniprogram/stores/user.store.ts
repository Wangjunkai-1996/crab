import type { AccountStatus, NullablePreferredView, PreferredView } from '../constants/enums';
import { STORAGE_KEYS } from '../constants/storage-keys';
import type { RoleFlags } from '../models/user';
import { createStore } from './create-store';

interface UserStoreState {
  userId: string;
  roleFlags: RoleFlags;
  accountStatus: AccountStatus;
  preferredView: NullablePreferredView;
  unreadCount: number;
}

function getStoredPreferredView(): NullablePreferredView {
  const stored = wx.getStorageSync(STORAGE_KEYS.preferredView);
  return stored === 'publisher' || stored === 'creator' ? stored : null;
}

const initialState: UserStoreState = {
  userId: '',
  roleFlags: {
    publisherEnabled: false,
    creatorEnabled: false,
  },
  accountStatus: 'normal',
  preferredView: getStoredPreferredView(),
  unreadCount: 0,
};

export const userStore = createStore(initialState);

export function hydrateUserStore(payload: Partial<UserStoreState>) {
  userStore.setState(payload);

  if (Object.prototype.hasOwnProperty.call(payload, 'preferredView')) {
    if (payload.preferredView) {
      wx.setStorageSync(STORAGE_KEYS.preferredView, payload.preferredView);
    } else {
      wx.removeStorageSync(STORAGE_KEYS.preferredView);
    }
  }
}

export function setPreferredViewInStore(preferredView: PreferredView) {
  userStore.setState({ preferredView });
  wx.setStorageSync(STORAGE_KEYS.preferredView, preferredView);
}

export function setUnreadCount(unreadCount: number) {
  userStore.setState({ unreadCount });
}
