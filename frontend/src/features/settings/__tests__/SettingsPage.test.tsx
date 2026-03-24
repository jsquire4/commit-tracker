import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { SettingsPage } from '../SettingsPage';

// ─── MSW helpers ─────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  displayName: 'Alice Smith',
  role: 'MANAGER' as const,
  reportsTo: null,
  reportsToDisplayName: null,
  isActive: true,
  costBandId: null,
  costBandName: null,
  costBandTier: null,
  weeklyCapacityHours: null,
};

const mockUserList = [mockUser];
const mockCostBands: unknown[] = [];

function addSettingsHandlers() {
  server.use(
    http.get('/api/v1/users/me', () =>
      HttpResponse.json({ data: mockUser }),
    ),
    http.get('/api/v1/users', () =>
      HttpResponse.json({ data: mockUserList }),
    ),
    http.get('/api/v1/users/cost-bands', () =>
      HttpResponse.json({ data: mockCostBands }),
    ),
  );
}

// ─── Tab visibility by role ───────────────────────────────────────────────────

describe('SettingsPage — tab visibility', () => {
  beforeEach(() => {
    addSettingsHandlers();
  });

  it('EMPLOYEE sees only the Profile tab', () => {
    renderWithProviders(<SettingsPage />, { auth: { role: 'EMPLOYEE' } });

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Organizations' })).not.toBeInTheDocument();
  });

  it('MANAGER sees Profile and Admin tabs', () => {
    renderWithProviders(<SettingsPage />, { auth: { role: 'MANAGER' } });

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Organizations' })).not.toBeInTheDocument();
  });

  it('VP sees Profile, Admin, and Organizations tabs', () => {
    renderWithProviders(<SettingsPage />, { auth: { role: 'VP' } });

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organizations' })).toBeInTheDocument();
  });

  it('EXECUTIVE sees Profile, Admin, and Organizations tabs', () => {
    renderWithProviders(<SettingsPage />, { auth: { role: 'EXECUTIVE' } });

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Organizations' })).toBeInTheDocument();
  });
});

// ─── Tab switching ────────────────────────────────────────────────────────────

describe('SettingsPage — tab switching', () => {
  beforeEach(() => {
    addSettingsHandlers();
  });

  it('Profile tab content is visible by default', async () => {
    renderWithProviders(<SettingsPage />, { auth: { role: 'MANAGER' } });

    // ProfileTab calls /api/v1/users/me — wait for it to resolve
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });

  it('clicking Admin tab renders Admin content', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { auth: { role: 'MANAGER' } });

    await user.click(screen.getByRole('button', { name: 'Admin' }));

    // AdminTab renders a search input once the user list loads
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Search by name or email...'),
      ).toBeInTheDocument();
    });
  });

  it('clicking Organizations tab renders Organizations content', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { auth: { role: 'VP' } });

    await user.click(screen.getByRole('button', { name: 'Organizations' }));

    // OrganizationsTab always renders this static heading
    await waitFor(() => {
      expect(screen.getByText('Portfolio Organizations')).toBeInTheDocument();
    });
  });

  it('switching tabs changes the active tab indicator', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsPage />, { auth: { role: 'MANAGER' } });

    const adminTab = screen.getByRole('button', { name: 'Admin' });
    await user.click(adminTab);

    // After clicking Admin, the Admin tab button should have the active border class
    expect(adminTab.className).toContain('border-accent');
    // Profile tab should no longer have the active border class
    expect(screen.getByRole('button', { name: 'Profile' }).className).not.toContain('border-accent');
  });
});
