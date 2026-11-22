import { buildShippedSnapshot } from './seed';
import type { ContentStoreSnapshot, ProgressStoreSnapshot } from './types';
import { emptyProgress } from './persistence';

let contentMemory: ContentStoreSnapshot | null = null;
let progressMemory: ProgressStoreSnapshot = emptyProgress();
let ready = false;

/** In-memory snapshot used by sync helpers (`packById`, etc.). */
export function getRuntimeSnapshot(): ContentStoreSnapshot {
  if (!contentMemory) {
    contentMemory = buildShippedSnapshot();
  }
  return contentMemory;
}

export function setRuntimeSnapshot(snapshot: ContentStoreSnapshot): void {
  contentMemory = snapshot;
  ready = true;
}

export function isContentStoreReady(): boolean {
  return ready;
}

export function getRuntimeProgress(): ProgressStoreSnapshot {
  return progressMemory;
}

export function setRuntimeProgress(progress: ProgressStoreSnapshot): void {
  progressMemory = progress;
}
