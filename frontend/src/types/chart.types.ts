/** Shared tooltip payload type for Recharts charts */
export interface TooltipPayloadEntry<T = Record<string, unknown>> {
  dataKey: string;
  value: number;
  payload: T;
}
