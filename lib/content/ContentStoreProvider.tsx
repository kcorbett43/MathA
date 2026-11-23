import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  bootstrapContentStore,
  commitContentSnapshot,
  getRuntimeProgress,
  type ContentStoreSnapshot,
  type ProgressStoreSnapshot,
} from '@/content/store';
import {
  importMathaBytes,
  prepareImport,
  type ImportPreview,
  type PlacementChoice,
} from '@/content/matha';
import {
  recordCardRating as persistCardRating,
  type CardRating,
} from '@/lib/reviewProgress';

type ContentStoreContextValue = {
  ready: boolean;
  snapshot: ContentStoreSnapshot | null;
  progress: ProgressStoreSnapshot | null;
  refresh: () => Promise<void>;
  prepareMatha: (bytes: Uint8Array) => ImportPreview;
  installMatha: (
    bytes: Uint8Array,
    placement: PlacementChoice | null,
  ) => Promise<{ status: string; preview: ImportPreview }>;
  /** Persist a Review self-rating keyed by packageId + unitId + cardId. */
  recordCardRating: (args: {
    packageId: string;
    unitId: string;
    cardId: string;
    rating: CardRating;
  }) => Promise<void>;
};

const ContentStoreContext = createContext<ContentStoreContextValue | null>(null);

export function ContentStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<ContentStoreSnapshot | null>(null);
  const [progress, setProgress] = useState<ProgressStoreSnapshot | null>(null);

  const refresh = useCallback(async () => {
    const { content, progress: prog } = await bootstrapContentStore();
    setSnapshot(content);
    setProgress(prog);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const prepareMatha = useCallback(
    (bytes: Uint8Array) => {
      if (!snapshot) throw new Error('Content store not ready');
      return prepareImport(bytes, snapshot).preview;
    },
    [snapshot],
  );

  const installMatha = useCallback(
    async (bytes: Uint8Array, placement: PlacementChoice | null) => {
      if (!snapshot) throw new Error('Content store not ready');
      const result = await importMathaBytes(
        bytes,
        snapshot,
        placement,
        getRuntimeProgress(),
      );
      if (result.status === 'installed' || result.status === 'noop') {
        await commitContentSnapshot(result.snapshot);
        setSnapshot(result.snapshot);
      }
      return { status: result.status, preview: result.preview };
    },
    [snapshot],
  );

  const recordCardRating = useCallback(
    async (args: {
      packageId: string;
      unitId: string;
      cardId: string;
      rating: CardRating;
    }) => {
      const next = await persistCardRating(args);
      setProgress(next);
    },
    [],
  );

  const value = useMemo(
    () => ({
      ready,
      snapshot,
      progress,
      refresh,
      prepareMatha,
      installMatha,
      recordCardRating,
    }),
    [
      ready,
      snapshot,
      progress,
      refresh,
      prepareMatha,
      installMatha,
      recordCardRating,
    ],
  );

  return (
    <ContentStoreContext.Provider value={value}>{children}</ContentStoreContext.Provider>
  );
}

export function useContentStore(): ContentStoreContextValue {
  const ctx = useContext(ContentStoreContext);
  if (!ctx) {
    throw new Error('useContentStore must be used within ContentStoreProvider');
  }
  return ctx;
}
