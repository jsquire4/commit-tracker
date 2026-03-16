import { describe, it, expect } from 'vitest';
import { CreateCommitmentFormSchema, ReconcileCommitmentFormSchema } from '../validation';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('CreateCommitmentFormSchema', () => {
  const validCommitment = {
    title: 'Implement auth feature',
    bullets: ['Write unit tests', 'Code review'],
    completionHorizon: 'EOD' as const,
  };

  it('accepts a valid commitment', () => {
    const result = CreateCommitmentFormSchema.safeParse(validCommitment);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      title: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const titleError = result.error.errors.find((e) => e.path[0] === 'title');
      expect(titleError).toBeDefined();
      expect(titleError?.message).toMatch(/title is required/i);
    }
  });

  it('rejects fewer than 2 bullets', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      bullets: ['only one bullet'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const bulletsError = result.error.errors.find((e) => e.path[0] === 'bullets');
      expect(bulletsError).toBeDefined();
    }
  });

  it('rejects more than 5 bullets', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      bullets: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const bulletsError = result.error.errors.find((e) => e.path[0] === 'bullets');
      expect(bulletsError).toBeDefined();
    }
  });

  it('rejects invalid horizon value', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      completionHorizon: 'INVALID_HORIZON',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional description', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      description: 'Some additional context',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid UUID for chessCategoryId', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      chessCategoryId: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for chessCategoryId', () => {
    const result = CreateCommitmentFormSchema.safeParse({
      ...validCommitment,
      chessCategoryId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  describe('RCDO consistency', () => {
    it('rejects outcome set without defining objective', () => {
      const result = CreateCommitmentFormSchema.safeParse({
        ...validCommitment,
        rallyCryId: VALID_UUID,
        outcomeId: VALID_UUID,
        // definingObjectiveId omitted intentionally
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const rcError = result.error.errors.find((e) =>
          e.path.includes('definingObjectiveId')
        );
        expect(rcError).toBeDefined();
      }
    });

    it('rejects defining objective set without rally cry', () => {
      const result = CreateCommitmentFormSchema.safeParse({
        ...validCommitment,
        definingObjectiveId: VALID_UUID,
        // rallyCryId omitted intentionally
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const rcError = result.error.errors.find((e) =>
          e.path.includes('rallyCryId')
        );
        expect(rcError).toBeDefined();
      }
    });

    it('accepts all three RCDO fields together', () => {
      const result = CreateCommitmentFormSchema.safeParse({
        ...validCommitment,
        rallyCryId: VALID_UUID,
        definingObjectiveId: VALID_UUID,
        outcomeId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });

    it('accepts rally cry alone', () => {
      const result = CreateCommitmentFormSchema.safeParse({
        ...validCommitment,
        rallyCryId: VALID_UUID,
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('ReconcileCommitmentFormSchema', () => {
  const validBulletStatus = {
    bulletId: VALID_UUID,
    done: true,
  };

  const validReconciliation = {
    status: 'COMPLETED' as const,
    carryForward: false,
    bulletStatuses: [validBulletStatus],
  };

  it('accepts a valid reconciliation with COMPLETED status', () => {
    const result = ReconcileCommitmentFormSchema.safeParse(validReconciliation);
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_STARTED', 'CARRIED_FORWARD'] as const;

    statuses.forEach((status) => {
      const result = ReconcileCommitmentFormSchema.safeParse({
        ...validReconciliation,
        status,
        completionNotes: status !== 'COMPLETED' ? 'Some notes' : undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid status enum value', () => {
    const result = ReconcileCommitmentFormSchema.safeParse({
      ...validReconciliation,
      status: 'INVALID_STATUS',
    });
    expect(result.success).toBe(false);
  });

  it('requires notes when status is not COMPLETED', () => {
    const result = ReconcileCommitmentFormSchema.safeParse({
      ...validReconciliation,
      status: 'NOT_STARTED',
      // completionNotes omitted
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const notesError = result.error.errors.find((e) =>
        e.path.includes('completionNotes')
      );
      expect(notesError).toBeDefined();
    }
  });

  it('accepts non-COMPLETED status when notes are provided', () => {
    const result = ReconcileCommitmentFormSchema.safeParse({
      ...validReconciliation,
      status: 'PARTIALLY_COMPLETED',
      completionNotes: 'Got halfway through',
    });
    expect(result.success).toBe(true);
  });

  it('requires carryForward boolean field', () => {
    const { carryForward: _cf, ...withoutCarryForward } = validReconciliation;
    const result = ReconcileCommitmentFormSchema.safeParse(withoutCarryForward);
    expect(result.success).toBe(false);
  });
});
