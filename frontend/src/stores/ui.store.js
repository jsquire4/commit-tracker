import { create } from 'zustand';
const DEFAULT_DASHBOARD_FILTERS = {};
export const useUIStore = create((set) => ({
    commitmentFormOpen: false,
    editingCommitmentId: null,
    activeDragId: null,
    dragOverIndex: null,
    dashboardFilters: DEFAULT_DASHBOARD_FILTERS,
    openCommitmentForm: (commitmentId) => set({
        commitmentFormOpen: true,
        editingCommitmentId: commitmentId ?? null,
    }),
    closeCommitmentForm: () => set({
        commitmentFormOpen: false,
        editingCommitmentId: null,
    }),
    setActiveDrag: (id) => set({ activeDragId: id }),
    setDragOverIndex: (index) => set({ dragOverIndex: index }),
    setDashboardFilters: (filters) => set((state) => ({
        dashboardFilters: { ...state.dashboardFilters, ...filters },
    })),
    resetDashboardFilters: () => set({ dashboardFilters: DEFAULT_DASHBOARD_FILTERS }),
}));
