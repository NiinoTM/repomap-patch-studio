import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { useFileSelection } from "../hooks/useFileSelection";
import {
  ContextSelectionItem,
  ContextSelectionSet,
} from "../../../types/contextSelection";

export interface ContextSelectionActions {
  addSeedFile: (filePath: string) => void;
  toggleFile: (filePath: string) => void;
  toggleFolder: (folderFiles: string[], shouldSelect: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleSuggestion: (filePath: string) => void;
  acceptAllSuggestions: (items: (ContextSelectionItem | string)[]) => void;
}

export interface ContextSelectionState {
  selectedFiles: ContextSelectionSet;
  seedFiles: ContextSelectionSet;
  selectedCount: number;
  selectedItems: ContextSelectionItem[];
}

export interface ContextSelectionContextValue
  extends ContextSelectionState,
    ContextSelectionActions {
  isSelected: (path: string) => boolean;
}

export class SelectionStore {
  private current: ContextSelectionSet;
  private listeners = new Set<() => void>();
  private pathListeners = new Map<string, Set<() => void>>();

  constructor(initial: ContextSelectionSet) {
    this.current = initial;
  }

  getSnapshot = (): ContextSelectionSet => {
    return this.current;
  };

  getPathSnapshot = (path: string) => (): boolean => {
    return this.current.has(path);
  };

  getCountSnapshot = (): number => {
    return this.current.size;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  subscribePath = (path: string, listener: () => void): (() => void) => {
    let set = this.pathListeners.get(path);
    if (!set) {
      set = new Set();
      this.pathListeners.set(path, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.pathListeners.delete(path);
      }
    };
  };

  notify(next: ContextSelectionSet): void {
    const prev = this.current;
    if (prev === next) return;
    this.current = next;

    for (const listener of this.listeners) {
      listener();
    }

    for (const [path, listeners] of this.pathListeners.entries()) {
      const wasSelected = prev.has(path);
      const isSelected = next.has(path);
      if (wasSelected !== isSelected) {
        for (const listener of listeners) {
          listener();
        }
      }
    }
  }
}

export const ContextSelectionStateContext = createContext<
  ContextSelectionState | undefined
>(undefined);

export const ContextSelectionDispatchContext = createContext<
  ContextSelectionActions | undefined
>(undefined);

export const ContextSelectionStoreContext = createContext<
  SelectionStore | undefined
>(undefined);

export interface ContextSelectionProviderProps {
  request: string;
  files: string[];
  children: ReactNode;
}

function useSelectionContextValue(selection: ReturnType<typeof useFileSelection>) {
  const actions = useMemo<ContextSelectionActions>(
    () => ({
      addSeedFile: selection.addSeedFile,
      toggleFile: selection.toggleFile,
      toggleFolder: selection.toggleFolder,
      selectAll: selection.selectAll,
      deselectAll: selection.deselectAll,
      toggleSuggestion: selection.toggleSuggestion,
      acceptAllSuggestions: selection.acceptAllSuggestions,
    }),
    [
      selection.addSeedFile,
      selection.toggleFile,
      selection.toggleFolder,
      selection.selectAll,
      selection.deselectAll,
      selection.toggleSuggestion,
      selection.acceptAllSuggestions,
    ],
  );

  const state = useMemo<ContextSelectionState>(
    () => ({
      selectedFiles: selection.selectedFiles,
      seedFiles: selection.seedFiles,
      selectedCount: selection.selectedFiles.size,
      selectedItems: selection.selectedFiles.getItems(),
    }),
    [selection.selectedFiles, selection.seedFiles],
  );

  return { actions, state };
}

export function ContextSelectionProvider({
  request,
  files,
  children,
}: ContextSelectionProviderProps) {
  const selection = useFileSelection({ request, files });
  const storeRef = useRef<SelectionStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new SelectionStore(selection.selectedFiles);
  }

  useEffect(() => {
    storeRef.current?.notify(selection.selectedFiles);
  }, [selection.selectedFiles]);

  const { actions, state } = useSelectionContextValue(selection);

  return (
    <ContextSelectionDispatchContext.Provider value={actions}>
      <ContextSelectionStateContext.Provider value={state}>
        <ContextSelectionStoreContext.Provider value={storeRef.current}>
          {children}
        </ContextSelectionStoreContext.Provider>
      </ContextSelectionStateContext.Provider>
    </ContextSelectionDispatchContext.Provider>
  );
}

export function useContextSelectionActions(): ContextSelectionActions {
  const context = useContext(ContextSelectionDispatchContext);
  if (!context) {
    throw new Error(
      "useContextSelectionActions must be used within a ContextSelectionProvider",
    );
  }
  return context;
}

export function useOptionalContextSelectionActions():
  | ContextSelectionActions
  | undefined {
  return useContext(ContextSelectionDispatchContext);
}

export function useContextSelectionState(): ContextSelectionState {
  const context = useContext(ContextSelectionStateContext);
  if (!context) {
    throw new Error(
      "useContextSelectionState must be used within a ContextSelectionProvider",
    );
  }
  return context;
}

export function useOptionalContextSelectionState():
  | ContextSelectionState
  | undefined {
  return useContext(ContextSelectionStateContext);
}

export function useSelectedCount(): number {
  const store = useContext(ContextSelectionStoreContext);
  const fallback = useContext(ContextSelectionStateContext);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (store) return store.subscribe(onStoreChange);
      return () => {};
    },
    [store],
  );

  const getSnapshot = useCallback(() => {
    if (store) return store.getCountSnapshot();
    return fallback ? fallback.selectedCount : 0;
  }, [store, fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

export function useIsSelected(path: string): boolean {
  const store = useContext(ContextSelectionStoreContext);
  const fallback = useContext(ContextSelectionStateContext);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (store) return store.subscribePath(path, onStoreChange);
      return () => {};
    },
    [store, path],
  );

  const getSnapshot = useCallback(() => {
    if (store) return store.getPathSnapshot(path)();
    return fallback ? fallback.selectedFiles.has(path) : false;
  }, [store, fallback, path]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useSelectedItems(): ContextSelectionItem[] {
  const state = useContextSelectionState();
  return state.selectedItems;
}

export function useSelectedFiles(): ContextSelectionSet {
  const state = useContextSelectionState();
  return state.selectedFiles;
}

export function useContextSelection(): ContextSelectionContextValue {
  const actions = useContextSelectionActions();
  const state = useContextSelectionState();

  const isSelected = useCallback(
    (path: string) => state.selectedFiles.has(path),
    [state.selectedFiles],
  );

  return useMemo(
    () => ({
      ...state,
      ...actions,
      isSelected,
    }),
    [state, actions, isSelected],
  );
}

export function useOptionalContextSelection():
  | ContextSelectionContextValue
  | undefined {
  const actions = useOptionalContextSelectionActions();
  const state = useOptionalContextSelectionState();
  if (!actions || !state) return undefined;

  return {
    ...state,
    ...actions,
    isSelected: (path: string) => state.selectedFiles.has(path),
  };
}