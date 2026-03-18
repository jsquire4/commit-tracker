import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useObservatoryConfig, useUpdateObservatoryConfig } from '@/hooks/useObservatory';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PageHeader } from '@/components/PageHeader';

interface ConfigFormValues {
  driftEmergingWeeks: number;
  driftSustainedWeeks: number;
  driftStructuralWeeks: number;
  strategicAlignmentTarget: string;
  misalignmentWarningPct: string;
  darkWorkWarningPct: string;
  concentrationRiskPct: string;
  uniformityThreshold: string;
}

const FIELD_META: {
  key: keyof ConfigFormValues;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  isPercent: boolean;
}[] = [
  {
    key: 'driftEmergingWeeks',
    label: 'Drift Emerging Threshold (weeks)',
    description: 'How many weeks of declining alignment before flagging as an emerging pattern?',
    min: 1,
    max: 52,
    step: 1,
    isPercent: false,
  },
  {
    key: 'driftSustainedWeeks',
    label: 'Drift Sustained Threshold (weeks)',
    description: 'How many weeks before escalating to a sustained trend?',
    min: 1,
    max: 52,
    step: 1,
    isPercent: false,
  },
  {
    key: 'driftStructuralWeeks',
    label: 'Drift Structural Threshold (weeks)',
    description: 'How many weeks before marking as a structural issue?',
    min: 1,
    max: 52,
    step: 1,
    isPercent: false,
  },
  {
    key: 'strategicAlignmentTarget',
    label: 'Strategic Alignment Target (%)',
    description: 'Target percentage of work that should be strategic.',
    min: 0,
    max: 100,
    step: 1,
    isPercent: true,
  },
  {
    key: 'misalignmentWarningPct',
    label: 'Misalignment Warning Threshold (%)',
    description: 'Warn when strategic work falls below this percentage.',
    min: 0,
    max: 100,
    step: 1,
    isPercent: true,
  },
  {
    key: 'darkWorkWarningPct',
    label: 'Dark Work Warning Threshold (%)',
    description: 'Warn when manager-assigned work exceeds this percentage.',
    min: 0,
    max: 100,
    step: 1,
    isPercent: true,
  },
  {
    key: 'concentrationRiskPct',
    label: 'Concentration Risk Threshold (%)',
    description: 'Warn when one person holds more than this percentage of assignments.',
    min: 0,
    max: 100,
    step: 1,
    isPercent: true,
  },
  {
    key: 'uniformityThreshold',
    label: 'Uniformity Threshold (%)',
    description: 'Flag teams where categorization is more uniform than this percentage.',
    min: 0,
    max: 100,
    step: 1,
    isPercent: true,
  },
];

export function ObservatoryConfigPage() {
  const { role } = useAuth();
  const { data: config, isLoading, isError } = useObservatoryConfig();
  const { mutateAsync: updateConfig, isPending } = useUpdateObservatoryConfig();

  const [formValues, setFormValues] = useState<ConfigFormValues | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (config) {
      setFormValues({
        driftEmergingWeeks: config.driftEmergingWeeks,
        driftSustainedWeeks: config.driftSustainedWeeks,
        driftStructuralWeeks: config.driftStructuralWeeks,
        strategicAlignmentTarget: config.strategicAlignmentTarget,
        misalignmentWarningPct: config.misalignmentWarningPct,
        darkWorkWarningPct: config.darkWorkWarningPct,
        concentrationRiskPct: config.concentrationRiskPct,
        uniformityThreshold: config.uniformityThreshold,
      });
    }
  }, [config]);

  // Role guard
  if (role !== 'EXECUTIVE') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Access Restricted</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Observatory configuration is restricted to executives. Contact your administrator to update these settings.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" label="Loading configuration…" />
      </div>
    );
  }

  if (isError || !formValues) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load observatory configuration.</p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          onClick={() => { window.location.reload(); }}
        >
          Retry
        </button>
      </div>
    );
  }

  function handleFieldChange(key: keyof ConfigFormValues, raw: string) {
    setFormValues((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: raw };
    });
    setSaveStatus('idle');
  }

  async function handleSave() {
    if (!formValues) return;
    setSaveStatus('idle');
    setErrorMessage('');
    try {
      await updateConfig({
        driftEmergingWeeks: Number(formValues.driftEmergingWeeks),
        driftSustainedWeeks: Number(formValues.driftSustainedWeeks),
        driftStructuralWeeks: Number(formValues.driftStructuralWeeks),
        strategicAlignmentTarget: formValues.strategicAlignmentTarget,
        misalignmentWarningPct: formValues.misalignmentWarningPct,
        darkWorkWarningPct: formValues.darkWorkWarningPct,
        concentrationRiskPct: formValues.concentrationRiskPct,
        uniformityThreshold: formValues.uniformityThreshold,
      });
      setSaveStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save configuration.');
      setSaveStatus('error');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PageHeader
        title="Observatory Configuration"
        subtitle="Adjust drift detection and alignment thresholds for your organization."
      />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
        {FIELD_META.map((field) => (
          <div key={field.key} className="space-y-1">
            <label
              htmlFor={`config-${field.key}`}
              className="block text-sm font-medium text-gray-900 dark:text-gray-100"
            >
              {field.label}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">{field.description}</p>
            <input
              id={`config-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={String(formValues[field.key])}
              onChange={(e) => { handleFieldChange(field.key, e.target.value); }}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        ))}

        {/* Status messages */}
        {saveStatus === 'success' && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
            <p className="text-sm text-green-700 dark:text-green-400">Configuration saved successfully.</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
            <p className="text-sm text-red-700 dark:text-red-400">{errorMessage || 'Failed to save configuration.'}</p>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving…' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
