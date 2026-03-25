import { z } from 'zod';

// Enum schemas — shared by form validation
export const CompletionHorizonSchema = z.enum(['MORNING', 'MIDDAY', 'AFTERNOON', 'EOD', 'EOW']);
export const CompletionDaySchema = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);
export const CompletionTimeBlockSchema = z.enum(['MORNING', 'MIDDAY', 'AFTERNOON', 'EOD']);
export const ReconciliationStatusSchema = z.enum(['COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_STARTED', 'CARRIED_FORWARD']);

// Form validation schemas (for react-hook-form)
// Base object schema (without cross-field refinements) — used by CommitmentFormV2 to .extend()
export const CreateCommitmentFormBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  description: z.string().max(2000).optional(),
  bullets: z.array(z.string().min(1)).min(2, 'At least 2 bullets required').max(5, 'Maximum 5 bullets'),
  completionHorizon: CompletionHorizonSchema,
  completionDay: CompletionDaySchema.optional(),
  completionTimeBlock: CompletionTimeBlockSchema.optional(),
  chessCategoryId: z.string().uuid().optional(),
  rallyCryId: z.string().uuid().optional(),
  definingObjectiveId: z.string().uuid().optional(),
  outcomeId: z.string().uuid().optional(),
  assignedBy: z.string().uuid().optional(),
});

export const CreateCommitmentFormSchema = CreateCommitmentFormBaseSchema.refine(
  (data) => !data.outcomeId || data.definingObjectiveId,
  { message: 'Defining Objective is required when Outcome is set', path: ['definingObjectiveId'] }
).refine(
  (data) => !data.definingObjectiveId || data.rallyCryId,
  { message: 'Rally Cry is required when Defining Objective is set', path: ['rallyCryId'] }
);

export const ReconcileCommitmentFormSchema = z.object({
  status: ReconciliationStatusSchema,
  completionNotes: z.string().max(2000).optional(),
  carryForward: z.boolean(),
  bulletStatuses: z.array(z.object({
    bulletId: z.string().uuid(),
    done: z.boolean(),
  })),
}).refine(
  (data) => data.status === 'COMPLETED' || (data.completionNotes && data.completionNotes.trim().length > 0),
  { message: 'Notes are required when status is not Completed', path: ['completionNotes'] }
);
