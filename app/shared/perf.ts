export type DurationSummary = {
  sampleCount: number;
  minMs: number;
  medianMs: number;
  averageMs: number;
  maxMs: number;
};

export function trimWarmupSamples(durationsMs: number[], warmupCount: number) {
  return durationsMs.slice(Math.max(0, warmupCount));
}

export function summarizeDurations(durationsMs: number[]): DurationSummary {
  if (durationsMs.length === 0) {
    return {
      sampleCount: 0,
      minMs: 0,
      medianMs: 0,
      averageMs: 0,
      maxMs: 0
    };
  }

  const sorted = [...durationsMs].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0
      ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
      : sorted[midpoint];
  const totalMs = durationsMs.reduce((sum, value) => sum + value, 0);

  return {
    sampleCount: durationsMs.length,
    minMs: sorted[0],
    medianMs,
    averageMs: totalMs / durationsMs.length,
    maxMs: sorted[sorted.length - 1]
  };
}
