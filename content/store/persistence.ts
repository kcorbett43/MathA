import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ContentStoreSnapshot, ProgressStoreSnapshot } from './types';

export const CONTENT_STORE_KEY = 'matha.content.v1';
export const PROGRESS_STORE_KEY = 'matha.progress.v1';

export async function loadContentSnapshot(): Promise<ContentStoreSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(CONTENT_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ContentStoreSnapshot;
  } catch {
    return null;
  }
}

export async function saveContentSnapshot(snapshot: ContentStoreSnapshot): Promise<void> {
  await AsyncStorage.setItem(CONTENT_STORE_KEY, JSON.stringify(snapshot));
}

export async function loadProgressSnapshot(): Promise<ProgressStoreSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProgressStoreSnapshot;
  } catch {
    return null;
  }
}

export async function saveProgressSnapshot(snapshot: ProgressStoreSnapshot): Promise<void> {
  await AsyncStorage.setItem(PROGRESS_STORE_KEY, JSON.stringify(snapshot));
}

export function emptyProgress(): ProgressStoreSnapshot {
  return { schemaVersion: 1, cards: [], questions: [] };
}
