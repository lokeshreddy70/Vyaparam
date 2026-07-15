import { useCallback, useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkspacePreferencesState = {
  favoritePaths: string[];
  pinnedPaths: string[];
  recentPaths: string[];
  toggleFavorite: (path: string) => void;
  togglePinned: (path: string) => void;
  pushRecent: (path: string) => void;
};

const MAX_RECENT = 12;

const useWorkspacePreferencesStore = create<WorkspacePreferencesState>()(
  persist(
    (set) => ({
      favoritePaths: [],
      pinnedPaths: [],
      recentPaths: [],
      toggleFavorite: (path) =>
        set((state) => ({
          favoritePaths: state.favoritePaths.includes(path)
            ? state.favoritePaths.filter((item) => item !== path)
            : [...state.favoritePaths, path],
        })),
      togglePinned: (path) =>
        set((state) => ({
          pinnedPaths: state.pinnedPaths.includes(path)
            ? state.pinnedPaths.filter((item) => item !== path)
            : [...state.pinnedPaths, path],
        })),
      pushRecent: (path) =>
        set((state) => {
          const next = [path, ...state.recentPaths.filter((item) => item !== path)].slice(0, MAX_RECENT);
          return { recentPaths: next };
        }),
    }),
    { name: "smartbiz-workspace-preferences" },
  ),
);

export function useWorkspacePreferences() {
  const favoritePaths = useWorkspacePreferencesStore((s) => s.favoritePaths);
  const pinnedPaths = useWorkspacePreferencesStore((s) => s.pinnedPaths);
  const recentPaths = useWorkspacePreferencesStore((s) => s.recentPaths);
  const toggleFavorite = useWorkspacePreferencesStore((s) => s.toggleFavorite);
  const togglePinned = useWorkspacePreferencesStore((s) => s.togglePinned);
  const pushRecent = useWorkspacePreferencesStore((s) => s.pushRecent);

  const favoriteSet = useMemo(() => new Set(favoritePaths), [favoritePaths]);
  const pinnedSet = useMemo(() => new Set(pinnedPaths), [pinnedPaths]);

  const isFavorite = useCallback((path: string) => favoriteSet.has(path), [favoriteSet]);
  const isPinned = useCallback((path: string) => pinnedSet.has(path), [pinnedSet]);

  return {
    favoritePaths,
    pinnedPaths,
    recentPaths,
    isFavorite,
    isPinned,
    toggleFavorite,
    togglePinned,
    pushRecent,
  };
}
