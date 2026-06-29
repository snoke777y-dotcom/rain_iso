export function scorePropagationCandidate(options: {
  candidateValue: number;
  neighborMean: number;
  anchorRefValue: number | null;
  ordinaryOnlyMode: boolean;
}): number {
  if (options.ordinaryOnlyMode || options.anchorRefValue === null) {
    return Math.abs(options.candidateValue - options.neighborMean);
  }

  return (
    0.7 * Math.abs(options.candidateValue - options.neighborMean) +
    0.3 * Math.abs(options.candidateValue - options.anchorRefValue)
  );
}
