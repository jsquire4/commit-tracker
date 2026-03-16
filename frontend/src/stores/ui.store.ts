import { create } from 'zustand';
import type { DashboardFilters } from '@/types';

const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {};

interface UIStore {
  commitmentFormOpen: boolean;
  editingCommitmentId: string | null;
  activeDragId: string | null;
  dragOverIndex: number | null;
  dashboardFilters: DashboardFilters;

  openCommitmentForm: (commitmentId?: string) => void;
  closeCommitmentForm: () => void;
  setActiveDrag: (id: string | null) => void;
  setDragOverIndex: (index: number | null) => void;
  setDashboardFilters: (filters: Partial<DashboardFilters>) => void;
  resetDashboardFilters: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  commitmentFormOpen: false,
  editingCommitmentId: null,
  activeDragId: null,
  dragOverIndex: null,
  dashboardFilters: DEFAULT_DASHBOARD_FILTERS,

  openCommitmentForm: (commitmentId?: string) =>
    set({
      commitmentFormOpen: true,
      editingCommitmentId: commitmentId ?? null,
    }),

  closeCommitmentForm: () =>
    set({
      commitmentFormOpen: false,
      editingCommitmentId: null,
    }),

  setActiveDrag: (id: string | null) => set({ activeDragId: id }),

  setDragOverIndex: (index: number | null) => set({ dragOverIndex: index }),

  setDashboardFilters: (filters: Partial<DashboardFilters>) =>
    set((state) => ({
      dashboardFilters: { ...state.dashboardFilters, ...filters },
    })),

  resetDashboardFilters: () =>
    set({ dashboardFilters: DEFAULT_DASHBOARD_FILTERS }),
}));
