import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { HorizonSelector } from '../HorizonSelector';
import type { CompletionHorizon } from '@/types';

describe('HorizonSelector', () => {
  it('renders day and time block options', () => {
    renderWithProviders(
      <HorizonSelector value="EOD" onChange={vi.fn()} />
    );

    // Day buttons
    expect(screen.getByRole('button', { name: /mon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /wed/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fri/i })).toBeInTheDocument();

    // Time block buttons
    expect(screen.getByRole('button', { name: /morning/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /midday/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /afternoon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /eod/i })).toBeInTheDocument();
  });

  it('highlights the selected option with aria-pressed=true', () => {
    renderWithProviders(
      <HorizonSelector value="MORNING" onChange={vi.fn()} />
    );

    const morningBtn = screen.getByRole('button', { name: /morning/i });
    expect(morningBtn).toHaveAttribute('aria-pressed', 'true');

    const eodBtn = screen.getByRole('button', { name: /eod/i });
    expect(eodBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the clicked horizon value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithProviders(
      <HorizonSelector value="EOD" onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: /morning/i }));
    expect(onChange).toHaveBeenCalledWith('MORNING' as CompletionHorizon);
  });

  it('renders the group with aria-label', () => {
    renderWithProviders(
      <HorizonSelector value="EOD" onChange={vi.fn()} />
    );

    expect(screen.getByRole('group', { name: /completion horizon/i })).toBeInTheDocument();
  });

  it('disables all buttons when disabled prop is true', () => {
    renderWithProviders(
      <HorizonSelector value="EOD" onChange={vi.fn()} disabled />
    );

    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
