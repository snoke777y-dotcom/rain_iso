export function scorePropagationCandidate(options) {
    if (options.ordinaryOnlyMode || options.anchorRefValue === null) {
        return Math.abs(options.candidateValue - options.neighborMean);
    }
    return (0.7 * Math.abs(options.candidateValue - options.neighborMean) +
        0.3 * Math.abs(options.candidateValue - options.anchorRefValue));
}
