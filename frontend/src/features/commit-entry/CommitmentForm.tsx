import { Fragment, useEffect } from 'react';
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
import { RcdoAutocomplete } from './RcdoAutocomplete';
import type { CompletionHorizon, ChessCategoryType } from '@/types';

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
      // Build payload, omitting undefined optional fields to satisfy exactOptionalPropertyTypes
      const payload = {
        cycleId,
        title: data.title,
        bullets: data.bullets,
        completionHorizon: data.completionHorizon,
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

  const rcdoValue = useWatch({ control, name: ['rallyCryId', 'definingObjectiveId', 'outcomeId'] });
  const rcdoLink = {
    rallyCryId: rcdoValue[0] ?? null,
    rallyCryTitle: null,
    definingObjectiveId: rcdoValue[1] ?? null,
    definingObjectiveTitle: null,
    outcomeId: rcdoValue[2] ?? null,
    outcomeTitle: null,
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
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-start justify-end">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-x-full"
            enterTo="opacity-100 translate-x-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-x-0"
            leaveTo="opacity-0 translate-x-full"
          >
            <Dialog.Panel className="relative h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isEdit ? 'Edit Commitment' : 'Add Commitment'}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none disabled:opacity-50"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <form
                id="commitment-form"
                onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
                className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
              >
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="title"
                    type="text"
                    {...register('title')}
                    placeholder="What do you commit to this week?"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
                  )}
                </div>

                {/* RCDO Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strategic Link
                  </label>
                  <RcdoAutocomplete
                    value={rcdoLink}
                    onChange={(link) => {
                      setValue('rallyCryId', link.rallyCryId ?? undefined);
                      setValue('definingObjectiveId', link.definingObjectiveId ?? undefined);
                      setValue('outcomeId', link.outcomeId ?? undefined);
                    }}
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category <span className="text-red-500">*</span>
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
                    <p className="mt-1 text-xs text-red-500">{errors.chessCategoryId.message}</p>
                  )}
                </div>

                {/* Horizon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Completion Horizon <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="completionHorizon"
                    control={control}
                    render={({ field }) => (
                      <HorizonSelector
                        value={field.value as CompletionHorizon}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.completionHorizon && (
                    <p className="mt-1 text-xs text-red-500">{errors.completionHorizon.message}</p>
                  )}
                </div>

                {/* Task Bullets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Task Bullets <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Minimum 2, maximum 5 bullets</p>
                  <Controller
                    name="bullets"
                    control={control}
                    render={({ field }) => (
                      <TaskBulletEditor
                        bullets={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  {errors.bullets && (
                    <p className="mt-1 text-xs text-red-500">
                      {typeof errors.bullets.message === 'string'
                        ? errors.bullets.message
                        : 'At least 2 bullets required'}
                    </p>
                  )}
                </div>

                {/* Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Attribution
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

                {/* Description (optional) */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes <span className="text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="description"
                    {...register('description')}
                    rows={3}
                    placeholder="Additional context..."
                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>

                {apiError && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3">
                    <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                  </div>
                )}
              </form>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 dark:ring-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="commitment-form"
                  disabled={isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {isPending && (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {isEdit ? 'Save Changes' : 'Add Commitment'}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
