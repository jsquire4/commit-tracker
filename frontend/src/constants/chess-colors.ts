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
  capability: '#94A3B8',
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
