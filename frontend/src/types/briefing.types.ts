/** Briefing API response types */

export interface BriefingSuggestion {
  id: string;
  text: string;
}

export interface BriefingCitation {
  id: string;
  label: string;
  detail: string;
  linkText?: string;
}

export interface BriefingMetric {
  key: string;
  label: string;
  value: number;
  suffix?: string;
  trend?: 'up' | 'down' | 'flat';
}

export interface BriefingResponse {
  generatedAt: string;
  headline: string;
  narrative: string;
  suggestions: BriefingSuggestion[];
  citations: BriefingCitation[];
  metrics: BriefingMetric[];
}
