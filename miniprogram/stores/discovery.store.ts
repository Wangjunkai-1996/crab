import { STORAGE_KEYS } from '../constants/storage-keys';
import type { DiscoveryFilter } from '../models/notice';
import { createStore } from './create-store';

interface DiscoveryStoreState {
  filter: DiscoveryFilter;
  recentKeywords: string[];
}

const initialState: DiscoveryStoreState = {
  filter: wx.getStorageSync(STORAGE_KEYS.discoveryFilter) || {},
  recentKeywords: wx.getStorageSync(STORAGE_KEYS.recentKeywords) || [],
};

export const discoveryStore = createStore(initialState);

export function setDiscoveryFilter(filter: DiscoveryFilter) {
  discoveryStore.setState({ filter });
  wx.setStorageSync(STORAGE_KEYS.discoveryFilter, filter);

  if (filter.city) {
    wx.setStorageSync(STORAGE_KEYS.recentCity, filter.city);
  }
}

export function resetDiscoveryFilter() {
  setDiscoveryFilter({});
}

export function pushRecentKeyword(keyword: string) {
  const normalized = keyword.trim();

  if (!normalized) {
    return;
  }

  const current = discoveryStore.getState().recentKeywords.filter((item) => item !== normalized);
  const next = [normalized, ...current].slice(0, 8);
  discoveryStore.setState({ recentKeywords: next });
  wx.setStorageSync(STORAGE_KEYS.recentKeywords, next);
}
