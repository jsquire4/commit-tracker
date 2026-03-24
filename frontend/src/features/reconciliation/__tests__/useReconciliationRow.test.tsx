import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useReconciliationRow, buildInitialRowState } from '../useReconciliationRow';
import type { CommitmentReconciliationDetail } from '@/types/reconciliation.types';
import { commitmentFactory } from '@/test/factories';

/* ─── Wrapper ────────────────────────────────────────────────────────────── */

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

/* ─── Fixtures ───────────────────────────────────────────────────────────── */

function makeDetail(
  overrides: Partial<CommitmentReconciliationDetail> = {},
): CommitmentReconciliationDetail {
  return {
    commitment: commitmentFactory(),
    reconciliation: null,
    ...overrides,
  };
}

/* ─── buildInitialRowState ───────────────────────────────────────────────── */

describe('buildInitialRowState', () => {
  it('sets status to null when no reconciliation record exists', () => {
    const detail = makeDetail();
    const state = buildInitialRowState(detail);
    expect(state.status).toBeNull();
  });

  it('reads status from existing reconciliation record', () => {
    const detail = makeDetail({
      reconciliation: {
        id: 'rec-1',
        commitmentId: 'c-1',
        cycleId: 'cy-1',
        status: 'COMPLETED',
        notes: 'Done!',
        plannedHorizon: 'EOD',
        reconciledAt: '2026-03-20T17:00:00Z',
        reconciledByUserId: 'user-1',
        displacementCategory: null,
        displacementDetail: null,
        displacingCommitmentId: null,
        displacingCommitmentTitle: null,
      },
    });
    const state = buildInitialRowState(detail);
    expect(state.status).toBe('COMPLETED');
    expect(state.notes).toBe('Done!');
  });

  it('remaps CARRIED_FORWARD to PARTIALLY_COMPLETED and sets carryForward flag', () => {
    const detail = makeDetail({
      reconciliation: {
        id: 'rec-2',
        commitmentId: 'c-1',
        cycleId: 'cy-1',
        status: 'CARRIED_FORWARD',
        notes: null,
        plannedHorizon: 'EOW',
        reconciledAt: '2026-03-20T17:00:00Z',
        reconciledByUserId: 'user-1',
        displacementCategory: null,
        displacementDetail: null,
        displacingCommitmentId: null,
        displacingCommitmentTitle: null,
      },
    });
    const state = buildInitialRowState(detail);
    expect(state.status).toBe('PARTIALLY_COMPLETED');
    expect(state.carryForward).toBe(true);
  });

  it('initialises bulletStatuses from commitment bullets', () => {
    const commitment = commitmentFactory({
      bullets: [
        { id: 'b-1', body: 'A', sortOrder: 1, isCompleted: true },
        { id: 'b-2', body: 'B', sortOrder: 2, isCompleted: false },
      ],
    });
    const state = buildInitialRowState({ commitment, reconciliation: null });
    expect(state.bulletStatuses['b-1']).toBe(true);
    expect(state.bulletStatuses['b-2']).toBe(false);
  });

  it('defaults saving and saveError to clean state', () => {
    const state = buildInitialRowState(makeDetail());
    expect(state.saving).toBe(false);
    expect(state.saveError).toBeNull();
  });
});

/* ─── useReconciliationRow ───────────────────────────────────────────────── */

describe('useReconciliationRow', () => {
  it('initialises row state from props', () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    expect(result.current.row.status).toBeNull();
    expect(result.current.row.notes).toBe('');
    expect(result.current.row.saving).toBe(false);
    expect(result.current.row.saveError).toBeNull();
  });

  it('initialises row with existing reconciliation data', () => {
    const detail = makeDetail({
      reconciliation: {
        id: 'rec-1',
        commitmentId: 'c-1',
        cycleId: 'cy-1',
        status: 'PARTIALLY_COMPLETED',
        notes: 'Some notes',
        plannedHorizon: 'EOD',
        reconciledAt: '2026-03-20T17:00:00Z',
        reconciledByUserId: 'user-1',
        displacementCategory: null,
        displacementDetail: null,
        displacingCommitmentId: null,
        displacingCommitmentTitle: null,
      },
    });
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    expect(result.current.row.status).toBe('PARTIALLY_COMPLETED');
    expect(result.current.row.notes).toBe('Some notes');
  });

  it('handleStatusChange updates status and triggers mutation for COMPLETED', async () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    await act(async () => {
      await result.current.handleStatusChange('COMPLETED');
    });

    await waitFor(() => {
      expect(result.current.row.status).toBe('COMPLETED');
      expect(result.current.row.saving).toBe(false);
    });
  });

  it('handleStatusChange updates status without saving when notes are required but empty', async () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    // NOT_STARTED requires notes — with empty notes it should update status but NOT set saving
    await act(async () => {
      await result.current.handleStatusChange('NOT_STARTED');
    });

    expect(result.current.row.status).toBe('NOT_STARTED');
    // saving should stay false because notes check blocked the mutation
    expect(result.current.row.saving).toBe(false);
  });

  it('handleStatusChange saves when notes present for non-COMPLETED status', async () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    // First put some notes in
    act(() => {
      result.current.handleNotesChange('Blocked by external dep');
    });

    await act(async () => {
      await result.current.handleStatusChange('NOT_STARTED');
    });

    await waitFor(() => {
      expect(result.current.row.status).toBe('NOT_STARTED');
      expect(result.current.row.saving).toBe(false);
      expect(result.current.row.saveError).toBeNull();
    });
  });

  it('handleNotesChange updates notes state immediately', () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.handleNotesChange('Updated notes text');
    });

    expect(result.current.row.notes).toBe('Updated notes text');
    // Changing notes alone must NOT trigger a save (no blur yet)
    expect(result.current.row.saving).toBe(false);
  });

  it('handleNotesBlur does not save when status is null', async () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.handleNotesChange('Some notes');
    });

    await act(async () => {
      await result.current.handleNotesBlur();
    });

    // No status set → no save should have happened
    expect(result.current.row.saving).toBe(false);
  });

  it('handleNotesBlur triggers save when status is set and notes changed', async () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    // Set status first
    await act(async () => {
      await result.current.handleStatusChange('COMPLETED');
    });

    // Then change notes and blur
    act(() => {
      result.current.handleNotesChange('Final note');
    });

    await act(async () => {
      await result.current.handleNotesBlur();
    });

    await waitFor(() => {
      expect(result.current.row.saving).toBe(false);
      expect(result.current.row.saveError).toBeNull();
    });
  });

  it('handleNotesBlur skips save when notes unchanged from persisted value', async () => {
    const persistedNotes = 'Already saved notes';
    const detail = makeDetail({
      reconciliation: {
        id: 'rec-1',
        commitmentId: 'c-1',
        cycleId: 'cy-1',
        status: 'COMPLETED',
        notes: persistedNotes,
        plannedHorizon: 'EOD',
        reconciledAt: '2026-03-20T17:00:00Z',
        reconciledByUserId: 'user-1',
        displacementCategory: null,
        displacementDetail: null,
        displacingCommitmentId: null,
        displacingCommitmentTitle: null,
      },
    });
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    // Blur without changing anything — should NOT save
    await act(async () => {
      await result.current.handleNotesBlur();
    });

    expect(result.current.row.saving).toBe(false);
  });

  it('handleDisplacementChange updates displacement in state', () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.handleDisplacementChange({
        category: 'PRODUCTION_EMERGENCY',
        detail: 'Urgent production incident',
        displacingCommitmentId: null,
      });
    });

    expect(result.current.row.displacement.category).toBe('PRODUCTION_EMERGENCY');
    expect(result.current.row.displacement.detail).toBe('Urgent production incident');
  });

  it('handleCarryForwardChange toggles carryForward flag', () => {
    const detail = makeDetail();
    const { result } = renderHook(
      () => useReconciliationRow(detail, 'cycle-1'),
      { wrapper: makeWrapper() },
    );

    act(() => {
      result.current.handleCarryForwardChange(true);
    });
    expect(result.current.row.carryForward).toBe(true);

    act(() => {
      result.current.handleCarryForwardChange(false);
    });
    expect(result.current.row.carryForward).toBe(false);
  });
});
