import { detectStationAnomaly } from "./detect-station-anomaly.js";
import { filterInvalidStations } from "./filter-invalid-stations.js";
export function buildEffectiveStations(observations, options) {
    const { validStations, invalidStations } = filterInvalidStations(observations, {
        validStationIds: options.validStationIds
    });
    const excludedStations = [...invalidStations];
    const candidateStations = validStations.filter((station) => {
        if (station.value === 0) {
            excludedStations.push({
                ...station,
                reason: "zero_rain_filtered"
            });
            return false;
        }
        return true;
    });
    const effectiveStations = [];
    const stationById = new Map(candidateStations.map((station) => [station.stationId, station]));
    for (const station of candidateStations) {
        const classified = detectStationAnomaly(station, {
            frameType: options.frameType,
            allValidStations: candidateStations,
            stationById,
            fallbackNeighborStationIdsByStationId: options.fallbackNeighborStationIdsByStationId
        });
        if (classified.status === "invalid") {
            excludedStations.push({
                stationId: classified.stationId,
                longitude: classified.longitude,
                latitude: classified.latitude,
                value: classified.value,
                reason: classified.reason
            });
            continue;
        }
        effectiveStations.push(classified);
    }
    return {
        effectiveStations,
        excludedStations
    };
}
