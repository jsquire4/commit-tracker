import { Fragment, useEffect, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, Transition } from '@headlessui/react';
import { z } from 'zod';
import { CreateCommitmentFormSchema } from '@/lib/validation';
import {
  useCreateCommitment,
  useUpdateCommitment,
  useCommitments,
} from '@/hooks/useCommitments';
import { HorizonSelector } from './HorizonSelector';
import { CategorySelector } from './CategorySelector';
import { AssignmentAttribution } from './AssignmentAttribution';
import { TaskBulletEditor } from './TaskBulletEditor';
import { StrategyLinker } from '@/features/shared/StrategyLinker';
import Button from '@/components/Button';
import type { CompletionHorizon, CompletionDay, CompletionTimeBlock, ChessCategoryType } from '@/types';

type FormValues = z.infer<typeof CreateCommitmentFormSchema>;

interface CommitmentFormProps {
  open: boolean;
  commitmentId?: string;
  cycleId: string;
  onClose: () => void;
}

const DEFAULT_BULLETS = ['', ''];

export function CommitmentForm({ open, commitmentId, cycleId, onClose }: CommitmentFormProps) {
  const isEdit = Boolean(commitmentId);

  const { data: commitments = [] } = useCommitments(cycleId, undefined);
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
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateCommitmentFormSchema),
    defaultValues: {
      title: '',
      description: '',
      bullets: DEFAULT_BULLETS,
      completionHorizon: 'EOD' as CompletionHorizon,
      completionDay: undefined,
      completionTimeBlock: undefined,
      chessCategoryId: undefined,
      rallyCryId: undefined,
      definingObjectiveId: undefined,
      outcomeId: undefined,
      assignedBy: undefined,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (open && existingCommitment) {
      reset({
        title: existingCommitment.title,
        description: existingCommitment.description ?? '',
        bullets: existingCommitment.bullets.map((b) => b.body),
        completionHorizon: existingCommitment.completionHorizon,
        completionDay: existingCommitment.completionDay ?? undefined,
        completionTimeBlock: existingCommitment.completionTimeBlock ?? undefined,
        chessCategoryId: existingCommitment.chessCategoryId ?? undefined,
        rallyCryId: existingCommitment.rcdoLink.rallyCryId ?? undefined,
        definingObjectiveId: existingCommitment.rcdoLink.definingObjectiveId ?? undefined,
        outcomeId: existingCommitment.rcdoLink.outcomeId ?? undefined,
        assignedBy:
          existingCommitment.attribution.kind === 'ASSIGNED_BY'
            ? existingCommitment.attribution.assignedById
            : undefined,
      });
    } else if (open && !existingCommitment) {
      reset({
        title: '',
        description: '',
        bullets: DEFAULT_BULLETS,
        completionHorizon: 'EOD',
        completionDay: undefined,
        completionTimeBlock: undefined,
        chessCategoryId: undefined,
        rallyCryId: undefined,
        definingObjectiveId: undefined,
        outcomeId: undefined,
        assignedBy: undefined,
      });
    }
  }, [open, existingCommitment, reset]);

  function handleClose() {
    if (!isPending) {
      onClose();
    }
  }

  async function onSubmit(data: FormValues) {
    try {
      const payload = {
        cycleId,
        title: data.title,
        bullets: data.bullets,
        completionHorizon: data.completionHorizon,
        ...(data.completionDay !== undefined && { completionDay: data.completionDay }),
        ...(data.completionTimeBlock !== undefined && { completionTimeBlock: data.completionTimeBlock }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.chessCategoryId !== undefined && { chessCategoryId: data.chessCategoryId }),
        ...(data.rallyCryId !== undefined && { rallyCryId: data.rallyCryId }),
        ...(data.definingObjectiveId !== undefined && { definingObjectiveId: data.definingObjectiveId }),
        ...(data.outcomeId !== undefined && { outcomeId: data.outcomeId }),
        ...(data.assignedBy !== undefined && { assignedBy: data.assignedBy }),
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

  const [rcdoTitles, setRcdoTitles] = useState<{
    rallyCryTitle: string | null;
    definingObjectiveTitle: string | null;
    outcomeTitle: string | null;
  }>({
    rallyCryTitle: existingCommitment?.rcdoLink.rallyCryTitle ?? null,
    definingObjectiveTitle: existingCommitment?.rcdoLink.definingObjectiveTitle ?? null,
    outcomeTitle: existingCommitment?.rcdoLink.outcomeTitle ?? null,
  });

  // Sync titles when the existing commitment loads (edit mode)
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

  const apiError =
    createMutation.error instanceof Error
      ? createMutation.error.message
      : updateMutation.error instanceof Error
        ? updateMutation.error.message
        : null;

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={handleClose}>
        {/* Overlay */}
        <Transition.Child
          as={Fragment}
          enter="duration-[200ms] ease-[var(--ease-standard)]"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="duration-[200ms] ease-[var(--ease-exit)]"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[rgba(45,52,50,0.4)]" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-start justify-end">
          {/* Slide-over panel */}
          <Transition.Child
            as={Fragment}
            enter="duration-[300ms] ease-[var(--ease-entrance)]"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="duration-[200ms] ease-[var(--ease-exit)]"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="relative h-full w-full max-w-[440px] bg-surface-lowest shadow-whisper flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-7 pt-5 pb-4 border-b border-outline-variant">
                <Dialog.Title className="font-serif text-headline text-on-surface tracking-[-0.01em]">
                  {isEdit ? 'Edit Commitment' : 'New Commitment'}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-sm text-on-surface-variant hover:bg-surface-container transition-colors duration-[150ms] focus:outline-none disabled:opacity-50"
                  aria-label="Close"
                >
                  <span className="text-xl leading-none">&times;</span>
                </button>
              </div>

              {/* Body */}
              <form
                id="commitment-form"
                onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
                className="flex-1 overflow-y-auto px-7 py-6 scrollbar-thin"
              >
                <div className="space-y-7">
                  {/* Title */}
                  <div className="field-section">
                    <label htmlFor="title" className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2">
                      What are you working on?
                    </label>
                    <input
                      id="title"
                      type="text"
                      {...register('title')}
                      placeholder="Describe your commitment..."
                      className="w-full bg-transparent border-0 border-b-2 border-b-outline-variant px-0 py-2 text-[16px] text-on-surface placeholder:text-muted focus:outline-none focus:border-b-accent transition-colors duration-[200ms]"
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
                            Break it down <span className="normal-case font-normal tracking-normal text-muted">({field.value.length} of 5)</span>
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
                          value={(field.value ?? null) as ChessCategoryType | null}
                          onChange={(c) => { field.onChange(c); }}
                        />
                      )}
                    />
                    {errors.chessCategoryId && (
                      <p className="mt-1 text-small text-error">{errors.chessCategoryId.message}</p>
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
                      render={({ field }) => (
                        <HorizonSelector
                          value={field.value as CompletionHorizon}
                          onChange={field.onChange}
                          onDayTimeChange={(v) => {
                            setValue('completionDay', v.day as CompletionDay | undefined);
                            setValue('completionTimeBlock', v.timeBlock as CompletionTimeBlock | undefined);
                          }}
                        />
                      )}
                    />
                    {errors.completionHorizon && (
                      <p className="mt-1 text-small text-error">{errors.completionHorizon.message}</p>
                    )}
                  </div>

                  {/* RCDO Link */}
                  <div className="field-section relative">
                    <StrategyLinker
                      value={rcdoLink}
                      onChange={(link) => {
                        setValue('rallyCryId', link.rallyCryId ?? undefined);
                        setValue('definingObjectiveId', link.definingObjectiveId ?? undefined);
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
                            field.value
                              ? { kind: 'ASSIGNED_BY', assignedById: field.value, assignedByName: '' }
                              : { kind: 'SELF_DIRECTED' }
                          }
                          onChange={(a) => {
                            field.onChange(a.kind === 'ASSIGNED_BY' ? a.assignedById : undefined);
                          }}
                        />
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <div className="field-section">
                    <label htmlFor="description" className="block text-label text-on-surface-variant uppercase tracking-[0.05rem] font-medium mb-2">
                      Notes <span className="normal-case font-normal tracking-normal text-muted">(optional)</span>
                    </label>
                    <textarea
                      id="description"
                      {...register('description')}
                      rows={3}
                      placeholder="Any additional context..."
                      className="w-full bg-surface-container-low rounded-sm p-3 text-body text-on-surface placeholder:text-muted resize-none focus:outline-none focus:shadow-[0_0_0_2px_var(--color-accent)] transition-shadow duration-[200ms]"
                    />
                    {errors.description && (
                      <p className="mt-1 text-small text-error">{errors.description.message}</p>
                    )}
                  </div>

                  {apiError && (
                    <div className="rounded-sm bg-error/[0.06] border border-error/20 px-4 py-3">
                      <p className="text-body text-error">{apiError}</p>
                    </div>
                  )}
                </div>
              </form>

              {/* Footer */}
              <div className="flex flex-col items-center gap-2.5 px-7 py-4 border-t border-outline-variant bg-surface-lowest">
                <Button
                  type="submit"
                  form="commitment-form"
                  variant="primary"
                  size="lg"
                  loading={isPending}
                  disabled={isPending}
                  className="w-full"
                >
                  {isEdit ? 'Save Changes' : 'Save Commitment'}
                </Button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-[0.8125rem] text-muted hover:text-on-surface-variant transition-colors duration-[150ms] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
