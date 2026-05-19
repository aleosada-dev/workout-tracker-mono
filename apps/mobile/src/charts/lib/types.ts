/** One point of a metric's history over time (e.g. one training session). */
export type MetricChartPoint = {
  /** ISO date string. */
  date: string;
  value: number;
};
