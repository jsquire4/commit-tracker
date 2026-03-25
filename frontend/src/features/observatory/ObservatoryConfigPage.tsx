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
    label: 'Unplanned Work Warning Threshold (%)',
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
        <div className="w-12 h-12 bg-surface-container rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-on-surface">Access Restricted</h1>
        <p className="text-sm text-muted max-w-sm">
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
        <p className="text-sm text-muted">Failed to load observatory configuration.</p>
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark transition-colors active:translate-y-px"
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

      <div className="bg-surface-lowest border border-outline-variant rounded-lg p-6 space-y-6">
        {FIELD_META.map((field) => (
          <div key={field.key} className="space-y-1">
            <label
              htmlFor={`config-${field.key}`}
              className="block text-sm font-medium text-on-surface"
            >
              {field.label}
            </label>
            <p className="text-xs text-muted">{field.description}</p>
            <input
              id={`config-${field.key}`}
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={String(formValues[field.key])}
              onChange={(e) => { handleFieldChange(field.key, e.target.value); }}
              disabled={isPending}
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-lowest px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        ))}

        {/* Status messages */}
        {saveStatus === 'success' && (
          <div className="rounded-md bg-accent/5 border border-accent/20 px-4 py-3">
            <p className="text-sm text-accent">Configuration saved successfully.</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="rounded-md bg-error/5 border border-error/20 px-4 py-3">
            <p className="text-sm text-error">{errorMessage || 'Failed to save configuration.'}</p>
          </div>
        )}

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={isPending}
            className="px-5 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent transition-colors duration-[var(--duration-fast)] active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving\u2026' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
