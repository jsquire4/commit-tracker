import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('renders without crashing', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Compass')).toBeInTheDocument();
  });

  it('hero section is visible', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Compass')).toBeInTheDocument();
    expect(
      screen.getByText(/See Whether Your Organization Is Executing on Strategy/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/View Demo/i)).toBeInTheDocument();
  });

  it('Problem section is present', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('The Problem')).toBeInTheDocument();
    expect(screen.getByText('Information Asymmetry')).toBeInTheDocument();
    expect(screen.getByText('Drift is Silent')).toBeInTheDocument();
    expect(screen.getByText('Middle Management is the Lever')).toBeInTheDocument();
  });

  it('How It Works section is present', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('How Compass Works')).toBeInTheDocument();
    expect(screen.getByText('Set Strategy')).toBeInTheDocument();
    expect(screen.getByText('Weekly Commitments')).toBeInTheDocument();
    expect(screen.getByText('Reconcile')).toBeInTheDocument();
    expect(screen.getByText('Intelligence')).toBeInTheDocument();
  });

  it('Role Cards section is present', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText('Built for Every Level')).toBeInTheDocument();
    expect(screen.getByText('Individual Contributors')).toBeInTheDocument();
    expect(screen.getByText('Managers')).toBeInTheDocument();
    expect(screen.getByText('Executives & Leadership')).toBeInTheDocument();
  });

  it('footer is visible', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText(/Compass — Execution Observability/i)).toBeInTheDocument();
    expect(screen.getByText(/Built by JS/i)).toBeInTheDocument();
  });
});
