import { Fragment, useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Transition } from '@headlessui/react';
import { z } from 'zod';
import { CreateCommitmentFormBaseSchema } from '@/lib/validation';
import {
  useCreateCommitment,
  useUpdateCommitment,
  useCommitments,
} from '@/hooks/useCommitments';
import { useChessCategories } from '@/hooks/useChessCategories';
import { useGrowthAreas } from '@/hooks/useGrowthAreas';
import { HorizonSelector } from './HorizonSelector';
import { CategorySelector } from './CategorySelector';
import { AssignmentAttribution } from './AssignmentAttribution';
import { TaskBulletEditor } from './TaskBulletEditor';
import { StrategyLinker } from '@/features/shared/StrategyLinker';
import { PersonalAlignmentView } from './PersonalAlignmentView';
import Button from '@/components/Button';
import type { Commitment, CompletionHorizon, CompletionDay, CompletionTimeBlock } from '@/types';

// Extend the base object schema (before refinements) to avoid ZodIntersection + ZodEffects issues
const CommitmentFormV2Schema = CreateCommitmentFormBaseSchema.extend({
  growthAreaIds: z.array(z.string().uuid()),
}).refine(
  (data) => !data.outcomeId || data.definingObjectiveId,
  { message: 'Defining Objective is required when Outcome is set', path: ['definingObjectiveId'] },
).refine(
  (data) => !data.definingObjectiveId || data.rallyCryId,
  { message: 'Rally Cry is required when Defining Objective is set', path: ['rallyCryId'] },
);

type FormValues = z.infer<typeof CommitmentFormV2Schema>;

interface CommitmentFormV2Props {
  open: boolean;
  commitmentId?: string;
  cycleId: string;
  onClose: () => void;
}

type Step = 'org' | 'personal';

const DEFAULT_BULLETS = ['', ''];

function getDefaultValues(commitment?: Commitment): FormValues {
  if (commitment) {
    return {
      title: commitment.title,
      description: commitment.description ?? '',
      bullets: commitment.bullets.map((b) => b.body),
      completionHorizon: commitment.completionHorizon,
      completionDay: commitment.completionDay ?? undefined,
      completionTimeBlock: commitment.completionTimeBlock ?? undefined,
      chessCategoryId: commitment.chessCategoryId ?? undefined,
      rallyCryId: commitment.rcdoLink.rallyCryId ?? undefined,
      definingObjectiveId: commitment.rcdoLink.definingObjectiveId ?? undefined,
      outcomeId: commitment.rcdoLink.outcomeId ?? undefined,
      assignedBy:
        commitment.attribution.kind === 'ASSIGNED_BY'
          ? commitment.attribution.assignedById
          : undefined,
      growthAreaIds: commitment.growthAreaIds ?? [],
    };
  }
  return {
    title: '',
    description: '',
    bullets: DEFAULT_BULLETS,
    completionHorizon: 'EOW' as CompletionHorizon,
    completionDay: 'FRIDAY' as CompletionDay,
    completionTimeBlock: 'EOD' as CompletionTimeBlock,
    chessCategoryId: undefined,
    rallyCryId: undefined,
    definingObjectiveId: undefined,
    outcomeId: undefined,
    assignedBy: undefined,
    growthAreaIds: [],
  };
}

// Step 1 field names — validated before advancing
// Only include required fields; optional fields (category, RCDO link, assignedBy, etc.)
// are validated on final submit, not on step transition.
const STEP_1_FIELDS = [
  'title',
  'bullets',
  'completionHorizon',
] as const;

export function CommitmentFormV2({ open, commitmentId, cycleId, onClose }: CommitmentFormV2Props) {
  const isEdit = Boolean(commitmentId);
  const [currentStep, setCurrentStep] = useState<Step>('org');
  // Track transition direction for animation
  const [isAnimatingForward, setIsAnimatingForward] = useState(true);
  // Track assignment mode separately from the assignedBy UUID value
  // (empty string is falsy, so we can't derive mode from the field value alone)
  const [assignmentMode, setAssignmentMode] = useState<'SELF_DIRECTED' | 'ASSIGNED_BY'>('SELF_DIRECTED');

  const { data: commitments = [] } = useCommitments(cycleId, undefined);
  const { data: chessCategories = [] } = useChessCategories();
  const { data: growthAreas = [] } = useGrowthAreas();
  const existingCommitment = commitmentId
    ? commitments.find((c) => c.id === commitmentId)
    : undefined;

  const createMutation = useCreateCommitment(cycleId);
  const updateMutation = useUpdateCommitment(cycleId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CommitmentFormV2Schema),
    defaultValues: getDefaultValues(),
  });

  const growthAreaIds = useWatch({ control, name: 'growthAreaIds' }) ?? [];

  // Populate form when editing or resetting for new commitment
  useEffect(() => {
    if (open) {
      reset(getDefaultValues(existingCommitment));
      setCurrentStep('org');
      setAssignmentMode(
        existingCommitment?.attribution.kind === 'ASSIGNED_BY'
          ? 'ASSIGNED_BY'
          : 'SELF_DIRECTED',
      );
    }
  }, [open, existingCommitment, reset]);

  const [rcdoTitles, setRcdoTitles] = useState<{
    rallyCryTitle: string | null;
    definingObjectiveTitle: string | null;
    outcomeTitle: string | null;
  }>({
    rallyCryTitle: existingCommitment?.rcdoLink.rallyCryTitle ?? null,
    definingObjectiveTitle: existingCommitment?.rcdoLink.definingObjectiveTitle ?? null,
    outcomeTitle: existingCommitment?.rcdoLink.outcomeTitle ?? null,
  });

  // Sync RCDO titles when existing commitment loads
  useEffect(() => {
    if (existingCommitment) {
      setRcdoTitles({
        rallyCryTitle: existingCommitment.rcdoLink.rallyCryTitle,
        definingObjectiveTitle: existingCommitment.rcdoLink.definingObjectiveTitle,
        outcomeTitle: existingCommitment.rcdoLink.outcomeTitle,
      });
    }
  }, [existingCommitment]);

  const rcdoValue = useWatch({ control, name: ['rallyCryId', 'definingObjectiveId', 'outcomeId'] });
  const rcdoLink = {
    rallyCryId: rcdoValue[0] ?? null,
    rallyCryTitle: rcdoTitles.rallyCryTitle,
    definingObjectiveId: rcdoValue[1] ?? null,
    definingObjectiveTitle: rcdoTitles.definingObjectiveTitle,
    outcomeId: rcdoValue[2] ?? null,
    outcomeTitle: rcdoTitles.outcomeTitle,
  };

  function handleClose() {
    if (!isPending) {
      onClose();
    }
  }

  async function handleNext() {
    const valid = await trigger(STEP_1_FIELDS);
    if (valid) {
      setIsAnimatingForward(true);
      setCurrentStep('personal');
    }
  }

  function handleBack() {
    setIsAnimatingForward(false);
    setCurrentStep('org');
  }

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        cycleId,
        title: data.title,
        bullets: data.bullets,
        completionHorizon: data.completionHorizon,
        ...(data.completionDay !== undefined && { completionDay: data.completionDay }),
        ...(data.completionTimeBlock !== undefined && {
          completionTimeBlock: data.completionTimeBlock,
        }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.chessCategoryId !== undefined && { chessCategoryId: data.chessCategoryId }),
        ...(data.rallyCryId !== undefined && { rallyCryId: data.rallyCryId }),
        ...(data.definingObjectiveId !== undefined && {
          definingObjectiveId: data.definingObjectiveId,
        }),
        ...(data.outcomeId !== undefined && { outcomeId: data.outcomeId }),
        ...(data.assignedBy !== undefined && { assignedBy: data.assignedBy }),
        growthAreaIds: data.growthAreaIds,
      };

      if (isEdit && commitmentId) {
        await updateMutation.mutateAsync({
          id: commitmentId,
          req: { id: commitmentId, ...payload },
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error displayed via mutation state
    }
  }

  const apiError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50" onClose={handleClose}>
        <div className="fixed inset-0 overflow-hidden">
          {/* Dark scrim */}
          <div className="absolute inset-0 bg-[rgba(45,52,50,0.4)]" aria-hidden="true" />
          {/* Panel aligned right */}
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <Transition.Child
              as={Fragment}
              enter="duration-[300ms] ease-[var(--ease-entrance)]"
              enterFrom="translate-x-full"
              enterTo="translate-x-0"
              leave="duration-[200ms] ease-[var(--ease-exit)]"
              leaveFrom="translate-x-0"
              leaveTo="translate-x-full"
            >
              <Dialog.Panel className="pointer-events-auto h-full w-[440px] bg-surface-lowest shadow-whisper flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-7 pt-5 pb-3 border-b border-outline-variant flex-shrink-0">
                  <div className="flex flex-col gap-1 min-w-0">
                    <Dialog.Title className="font-serif text-headline text-on-surface tracking-[-0.01em]">
                      {isEdit ? 'Edit Commitment' : 'New Commitment'}
                    </Dialog.Title>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div
                          className={[
                            'h-1.5 rounded-full transition-all duration-[var(--duration-standard)]',
                            currentStep === 'org'
                              ? 'w-5 bg-accent'
                              : 'w-2 bg-accent/40',
                          ].join(' ')}
                        />
                        <div
                          className={[
                            'h-1.5 rounded-full transition-all duration-[var(--duration-standard)]',
                            currentStep === 'personal'
                              ? 'w-5 bg-accent'
                              : 'w-2 bg-surface-container-highest',
                          ].join(' ')}
                        />
                      </div>
                      <span className="text-small text-muted">
                        Step {currentStep === 'org' ? '1' : '2'} of 2
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="w-8 h-8 flex items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container transition-colors duration-[150ms] focus:outline-none disabled:opacity-50 flex-shrink-0"
                    aria-label="Close"
                  >
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>

                {/* Two-step viewport — overflow hidden, slides between steps */}
                <div className="flex-1 overflow-hidden relative">
                  {/* Step 1 — Org Alignment */}
                  <div
                    className="absolute inset-0 flex flex-col transition-transform duration-[300ms] ease-[var(--ease-entrance)]"
                    style={{
                      transform:
                        currentStep === 'org'
                          ? 'translateX(0)'
                          : 'translateX(-100%)',
                    }}
                    {...(currentStep !== 'org' ? { inert: '' } : {})}
                  >
                    <form
                      id="commitment-form-v2"
                      onSubmit={(e) => {
                        void handleSubmit(onSubmit)(e);
                      }}
                      className="flex-1 overflow-y-auto px-7 py-6 scrollbar-thin"
                    >
                      <div className="space-y-7">
                        {/* Title */}
                        <div className="field-section">
                          <label
                            htmlFor="title-v2"
                            className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2"
                          >
                            What are you working on?
                          </label>
                          <input
                            id="title-v2"
                            type="text"
                            {...register('title')}
                            placeholder="Describe your commitment..."
                            className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-body text-on-surface placeholder:text-muted focus:outline-none focus:border-b-accent transition-colors duration-[200ms]"
                          />
                          {errors.title && (
                            <p className="mt-1 text-small text-error">{errors.title.message}</p>
                          )}
                        </div>

                        {/* Task Bullets */}
                        <div className="field-section">
                          <Controller
                            name="bullets"
                            control={control}
                            render={({ field }) => (
                              <>
                                <label className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2">
                                  Break it down{' '}
                                  <span className="normal-case font-normal tracking-normal text-muted">
                                    ({field.value.length} of 5)
                                  </span>
                                </label>
                                <TaskBulletEditor
                                  bullets={field.value}
                                  onChange={field.onChange}
                                />
                              </>
                            )}
                          />
                          {errors.bullets && (
                            <p className="mt-1 text-small text-error">
                              {typeof errors.bullets.message === 'string'
                                ? errors.bullets.message
                                : 'At least 2 bullets required'}
                            </p>
                          )}
                        </div>

                        {/* Category */}
                        <div className="field-section">
                          <label className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2">
                            Category
                          </label>
                          <Controller
                            name="chessCategoryId"
                            control={control}
                            render={({ field }) => (
                              <CategorySelector
                                value={field.value ?? null}
                                onChange={(id) => {
                                  field.onChange(id);
                                }}
                                categories={chessCategories}
                              />
                            )}
                          />
                          {errors.chessCategoryId && (
                            <p className="mt-1 text-small text-error">
                              {errors.chessCategoryId.message}
                            </p>
                          )}
                        </div>

                        {/* Horizon */}
                        <div className="field-section">
                          <label className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2">
                            When will this be done?
                          </label>
                          <Controller
                            name="completionHorizon"
                            control={control}
                            render={({ field }) => {
                              const watchedDay = watch('completionDay');
                              const watchedTimeBlock = watch('completionTimeBlock');
                              return (
                                <HorizonSelector
                                  value={field.value as CompletionHorizon}
                                  {...(watchedDay !== undefined && { day: watchedDay })}
                                  {...(watchedTimeBlock !== undefined && { timeBlock: watchedTimeBlock })}
                                  onChange={field.onChange}
                                  onDayTimeChange={(v) => {
                                    setValue('completionDay', v.day as CompletionDay | undefined);
                                    setValue('completionTimeBlock', v.timeBlock as CompletionTimeBlock | undefined);
                                  }}
                                />
                              );
                            }}
                          />
                          {errors.completionHorizon && (
                            <p className="mt-1 text-small text-error">
                              {errors.completionHorizon.message}
                            </p>
                          )}
                        </div>

                        {/* RCDO Link */}
                        <div className="field-section relative">
                          <StrategyLinker
                            value={rcdoLink}
                            onChange={(link) => {
                              setValue('rallyCryId', link.rallyCryId ?? undefined);
                              setValue(
                                'definingObjectiveId',
                                link.definingObjectiveId ?? undefined,
                              );
                              setValue('outcomeId', link.outcomeId ?? undefined);
                              setRcdoTitles({
                                rallyCryTitle: link.rallyCryTitle,
                                definingObjectiveTitle: link.definingObjectiveTitle,
                                outcomeTitle: link.outcomeTitle,
                              });
                            }}
                          />
                        </div>

                        {/* Attribution */}
                        <div className="field-section">
                          <label className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2">
                            Who assigned this?
                          </label>
                          <Controller
                            name="assignedBy"
                            control={control}
                            render={({ field }) => (
                              <AssignmentAttribution
                                value={
                                  assignmentMode === 'ASSIGNED_BY'
                                    ? {
                                        kind: 'ASSIGNED_BY',
                                        assignedById: field.value ?? '',
                                        assignedByName: existingCommitment?.attribution?.kind === 'ASSIGNED_BY'
                                          ? existingCommitment.attribution.assignedByName ?? ''
                                          : '',
                                      }
                                    : { kind: 'SELF_DIRECTED' }
                                }
                                onChange={(a) => {
                                  setAssignmentMode(a.kind);
                                  field.onChange(
                                    a.kind === 'ASSIGNED_BY' && a.assignedById
                                      ? a.assignedById
                                      : undefined,
                                  );
                                }}
                              />
                            )}
                          />
                        </div>

                        {/* Notes */}
                        <div className="field-section">
                          <label
                            htmlFor="description-v2"
                            className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2"
                          >
                            Notes{' '}
                            <span className="normal-case font-normal tracking-normal text-muted">
                              (optional)
                            </span>
                          </label>
                          <textarea
                            id="description-v2"
                            {...register('description')}
                            rows={3}
                            placeholder="Any additional context..."
                            className="w-full bg-surface-container-low rounded-sm p-3 text-body text-on-surface placeholder:text-muted resize-none focus:outline-none focus:shadow-[0_0_0_2px_var(--color-accent)] transition-shadow duration-[200ms]"
                          />
                          {errors.description && (
                            <p className="mt-1 text-small text-error">
                              {errors.description.message}
                            </p>
                          )}
                        </div>

                        {apiError && (
                          <div className="rounded-sm bg-error/[0.06] border border-error/20 px-4 py-3">
                            <p className="text-body text-error">{apiError}</p>
                          </div>
                        )}
                      </div>
                    </form>

                    {/* Step 1 Footer */}
                    <div className="flex flex-col items-center gap-2.5 px-7 py-4 border-t border-outline-variant bg-surface-lowest flex-shrink-0">
                      <Button
                        type="button"
                        variant="primary"
                        size="lg"
                        disabled={isPending}
                        onClick={() => {
                          void handleNext();
                        }}
                        className="w-full"
                      >
                        Next →
                      </Button>
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={isPending}
                        className="text-sm text-muted hover:text-on-surface-variant transition-colors duration-[150ms] disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  {/* Step 2 — Personal Alignment */}
                  <div
                    className="absolute inset-0 flex flex-col transition-transform duration-[300ms] ease-[var(--ease-entrance)]"
                    style={{
                      transform:
                        currentStep === 'personal'
                          ? 'translateX(0)'
                          : isAnimatingForward
                            ? 'translateX(100%)'    // exit to right (going forward past step 2)
                            : 'translateX(-100%)',  // exit to left (going back to step 1)
                    }}
                    {...(currentStep !== 'personal' ? { inert: '' } : {})}
                  >
                    <PersonalAlignmentView
                      growthAreas={growthAreas}
                      selectedIds={growthAreaIds}
                      onChange={(ids) => {
                        setValue('growthAreaIds', ids);
                      }}
                      onBack={handleBack}
                      onSave={() => {
                        void handleSubmit(onSubmit)();
                      }}
                      isPending={isPending}
                      isEdit={isEdit}
                    />
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
