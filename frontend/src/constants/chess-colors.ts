/**
 * Shared CHESS category color palettes.
 * MUTED — for Observatory charts (desaturated, data-viz appropriate).
 * ACCENT — for UI elements, badges, bars (higher contrast).
 */

/** Muted palette for data visualization (Observatory charts, heatmaps) */
export const CHESS_MUTED = {
  strategic: '#5B7FA6',
  operational: '#8E9AA0',
  defensive: '#B07070',
  capability: '#6B9F7F',
  uncategorized: '#E2E2E0',
} as const;

/** Accent palette for UI elements (badges, chips, bars) */
export const CHESS_ACCENT = {
  strategic: '#036A6A',
  operational: '#455F87',
  defensive: '#9F403D',
  capability: '#059669', // Matches Tailwind `capability` token
} as const;

/** Display labels keyed by uppercase enum name */
export const CHESS_LABELS: Record<string, string> = {
  STRATEGIC: 'Strategic',
  OPERATIONAL: 'Operational',
  DEFENSIVE: 'Defensive',
  CAPABILITY_BUILDING: 'Capability Building',
};

/** Map display name (from API) to palette key */
export const CHESS_NAME_TO_KEY: Record<string, keyof typeof CHESS_MUTED> = {
  Strategic: 'strategic',
  Operational: 'operational',
  Defensive: 'defensive',
  'Capability Building': 'capability',
};

/**
 * Bar-indicator colors keyed by display name (from API chessCategoryName).
 * Used in CommitmentRow and similar list-view indicators.
 * Deliberately different from CHESS_ACCENT — tuned for small bar swatches.
 */
export const CHESS_BAR_COLORS: Record<string, string> = {
  Strategic: '#036A6A',
  Operational: '#DCD9D4',
  Defensive: '#C2860B',
  'Capability Building': '#455F87',
};
