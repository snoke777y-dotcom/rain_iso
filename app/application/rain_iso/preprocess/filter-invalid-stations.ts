import type {
  InvalidStation,
  StationObservation,
  ValidStation
} from "./types.js";

export function filterInvalidStations(
  observations: StationObservation[],
  options: {
    validStationIds: Set<string>;
  }
): {
  validStations: ValidStation[];
  invalidStations: InvalidStation[];
} {
  const validStations: ValidStation[] = [];
  const invalidStations: InvalidStation[] = [];

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
