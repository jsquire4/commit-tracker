import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { CommitmentForm } from '../CommitmentForm';

function renderForm(props?: Partial<Parameters<typeof CommitmentForm>[0]>) {
  return renderWithProviders(
    <CommitmentForm
      open={true}
      cycleId="cycle-1"
      onClose={vi.fn()}
      {...props}
    />
  );
}

describe('CommitmentForm', () => {
  it('renders all key fields', () => {
    renderForm();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /completion horizon/i })).toBeInTheDocument();
    expect(screen.getByText(/task bullets/i)).toBeInTheDocument();
  });

  it('shows Add Commitment button', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /add commitment/i })).toBeInTheDocument();
  });

  it('shows edit header when commitmentId is provided', () => {
    renderForm({ commitmentId: 'commit-1' });
    expect(screen.getByRole('heading', { name: /edit commitment/i })).toBeInTheDocument();
  });

  it('shows validation error when title is empty and form is submitted', async () => {
    const user = userEvent.setup();
    renderForm();

    const submitBtn = screen.getByRole('button', { name: /add commitment/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('enforces minimum 2 bullet inputs by default', () => {
    renderForm();
    const bulletInputs = screen.getAllByRole('textbox', { name: /task bullet/i });
    expect(bulletInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render when open is false', () => {
    renderForm({ open: false });
    expect(screen.queryByRole('heading', { name: /commitment/i })).not.toBeInTheDocument();
  });
});
