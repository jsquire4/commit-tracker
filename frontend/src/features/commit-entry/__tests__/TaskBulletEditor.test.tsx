import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/test-utils';
import { TaskBulletEditor } from '../TaskBulletEditor';

describe('TaskBulletEditor', () => {
  it('renders the correct number of bullet inputs', () => {
    renderWithProviders(
      <TaskBulletEditor
        bullets={['First', 'Second']}
        onChange={vi.fn()}
      />
    );

    const inputs = screen.getAllByRole('textbox', { name: /task bullet/i });
    expect(inputs).toHaveLength(2);
  });

  it('calls onChange with new value when text is changed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithProviders(
      <TaskBulletEditor
        bullets={['First', 'Second']}
        onChange={onChange}
      />
    );

    const inputs = screen.getAllByRole('textbox', { name: /task bullet/i });
    const firstInput = inputs[0];
    if (!firstInput) throw new Error('Expected at least one bullet input');
    await user.clear(firstInput);
    await user.type(firstInput, 'Updated');

    expect(onChange).toHaveBeenCalled();
  });

  it('adds a bullet when "Add bullet" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithProviders(
      <TaskBulletEditor
        bullets={['First', 'Second']}
        onChange={onChange}
        max={5}
      />
    );

    await user.click(screen.getByRole('button', { name: /add bullet/i }));
    expect(onChange).toHaveBeenCalledWith(['First', 'Second', '']);
  });

  it('does not add bullets beyond max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithProviders(
      <TaskBulletEditor
        bullets={['A', 'B', 'C', 'D', 'E']}
        onChange={onChange}
        max={5}
      />
    );

    const addBtn = screen.getByRole('button', { name: /add bullet/i });
    expect(addBtn).toBeDisabled();

    await user.click(addBtn);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a bullet when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithProviders(
      <TaskBulletEditor
        bullets={['First', 'Second', 'Third']}
        onChange={onChange}
        min={2}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove bullet/i });
    const firstRemove = removeButtons[0];
    if (!firstRemove) throw new Error('Expected at least one remove button');
    await user.click(firstRemove);

    expect(onChange).toHaveBeenCalledWith(['Second', 'Third']);
  });

  it('disables remove buttons when at minimum bullets', () => {
    renderWithProviders(
      <TaskBulletEditor
        bullets={['First', 'Second']}
        onChange={vi.fn()}
        min={2}
      />
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove bullet/i });
    removeButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
