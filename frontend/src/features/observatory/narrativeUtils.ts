/**
 * Shared narrative generation utilities for Observatory components.
 */

export interface WeekNarrativeData {
  strategicPct: number;
  operationalPct: number;
  defensivePct: number;
  capabilityBuildingPct: number;
  rallyCoveragePct?: number;
  completionRate?: number | null;
  carryForwardRate?: number | null;
  weekLabel?: string;
}

/**
 * Generates a templated two-sentence AI narrative for a week's execution data.
 * Can be used by any Observatory component that displays CHESS-aligned metrics.
 *
 * @param data   Metrics for the week being described.
 * @param allData Optional array of all weeks in the dataset, used to detect
 *               relative highs/lows and week-over-week changes. When omitted,
 *               only absolute-value sentences are generated.
 */
export function generateWeekNarrative(
  data: WeekNarrativeData,
  allData?: WeekNarrativeData[],
): string {
  const { strategicPct, defensivePct, completionRate } = data;
  // Use rallyCoveragePct when available; fall back to strategicPct for older data shapes
  const strategicAlignment = data.rallyCoveragePct ?? strategicPct;

  const sentences: string[] = [];

  if (allData && allData.length > 1) {
    const maxStrategic = Math.max(...allData.map((d) => d.strategicPct));
    const minStrategic = Math.min(...allData.map((d) => d.strategicPct));
    const isHighest = strategicPct === maxStrategic;
    const isLowest = strategicPct === minStrategic;

    // Find previous week for week-over-week comparison
    const idx = allData.indexOf(data);
    const prev = idx > 0 ? allData[idx - 1] : null;

    if (isHighest) {
      sentences.push(
        `This was the strongest strategic week in the period, with ${strategicPct.toFixed(0)}% of commitments in the Strategic category.`,
      );
    } else if (isLowest) {
      sentences.push(
        `Strategic work hit its lowest point at ${strategicPct.toFixed(0)}%, with operational and other work dominating the mix.`,
      );
    } else if (defensivePct > 15) {
      sentences.push(
        `Defensive work was elevated at ${defensivePct.toFixed(0)}% this week, pulling capacity away from strategic initiatives.`,
      );
    } else if (prev && strategicPct < prev.strategicPct - 5) {
      const drop = (prev.strategicPct - strategicPct).toFixed(0);
      sentences.push(
        `Strategic work declined ${drop} points from the prior week to ${strategicPct.toFixed(0)}%, suggesting a shift toward operational priorities.`,
      );
    } else if (prev && strategicPct > prev.strategicPct + 5) {
      const gain = (strategicPct - prev.strategicPct).toFixed(0);
      sentences.push(
        `Strategic work increased ${gain} points week-over-week to ${strategicPct.toFixed(0)}%, a positive shift in execution focus.`,
      );
    } else {
      sentences.push(
        `Strategic work made up ${strategicPct.toFixed(0)}% of commitments this week, with a balanced mix across operational and capability categories.`,
      );
    }
  } else {
    // Absolute-value fallback when no comparative dataset is available
    if (defensivePct > 15) {
      sentences.push(
        `Defensive work was elevated at ${defensivePct.toFixed(0)}% this week, pulling capacity away from strategic initiatives.`,
      );
    } else {
      sentences.push(
        `Strategic work made up ${strategicPct.toFixed(0)}% of commitments this week, with a balanced mix across operational and capability categories.`,
      );
    }
  }

  // Sentence 2 — completion + RC coverage
  if (completionRate != null) {
    const completionStr = completionRate.toFixed(0);
    const rcStr = strategicAlignment.toFixed(0);
    sentences.push(
      `Completion rate was ${completionStr}% and rally cry coverage was ${rcStr}%.`,
    );
  } else {
    sentences.push(`Rally cry coverage was ${strategicAlignment.toFixed(0)}% for the week.`);
  }

  return sentences.join(' ');
}
