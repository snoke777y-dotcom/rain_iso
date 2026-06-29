export function filterInvalidStations(observations, options) {
    const validStations = [];
    const invalidStations = [];
    for (const observation of observations) {
        if (!options.validStationIds.has(observation.stationId)) {
            invalidStations.push({
                ...observation,
                reason: "station_not_mapped"
            });
            continue;
        }
        if (Number.isNaN(observation.value)) {
            invalidStations.push({
                ...observation,
                reason: "missing_value"
            });
            continue;
        }
        if (!Number.isFinite(observation.value)) {
            invalidStations.push({
                ...observation,
                reason: "non_finite_value"
            });
            continue;
        }
        if (observation.value < 0) {
            invalidStations.push({
                ...observation,
                reason: "negative_value"
            });
            continue;
        }
        validStations.push(observation);
    }
    return {
        validStations,
        invalidStations
    };
}
