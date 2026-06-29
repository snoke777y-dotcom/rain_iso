import { getLegendByFrameType } from "../../../domain/rain_iso/legend.js";
export function detectStationAnomaly(observation, options) {
    const neighborhoodStations = options.allValidStations.filter((candidate) => candidate.stationId !== observation.stationId &&
        getDistanceMeters(observation, candidate) <= 5_000);
    const supplementedNeighborhoodStations = supplementNeighborhoodStations(observation, neighborhoodStations, {
        stationById: options.stationById ??
            new Map(options.allValidStations.map((station) => [station.stationId, station])),
        fallbackNeighborStationIdsByStationId: options.fallbackNeighborStationIdsByStationId
    });
    if (supplementedNeighborhoodStations.length < 4) {
        return {
            ...observation,
            status: "normal",
            canBeDynamicAnchor: true
        };
    }
    const sortedNeighborValues = supplementedNeighborhoodStations
        .map((candidate) => candidate.value)
        .sort((left, right) => right - left);
    const maxValue = sortedNeighborValues[0];
    const secondMaxValue = sortedNeighborValues[1];
    if (secondMaxValue === undefined || maxValue > secondMaxValue * 2) {
        return {
            ...observation,
            status: "normal",
            canBeDynamicAnchor: true
        };
    }
    const legend = getLegendByFrameType(options.frameType);
    const referenceBinIndex = resolveLegendBinIndex(legend.bins, maxValue);
    const currentBinIndex = resolveLegendBinIndex(legend.bins, observation.value);
    const binDistance = Math.abs(currentBinIndex - referenceBinIndex);
    if (binDistance <= 1) {
        return {
            ...observation,
            status: "normal",
            canBeDynamicAnchor: true
        };
    }
    if (binDistance === 2) {
        return {
            ...observation,
            status: "suspect",
            canBeDynamicAnchor: false,
            reason: "outside_normal_bins"
        };
    }
    return {
        ...observation,
        status: "invalid",
        canBeDynamicAnchor: false,
        reason: "outside_suspect_bins"
    };
}
function supplementNeighborhoodStations(observation, neighborhoodStations, options) {
    if (neighborhoodStations.length >= 4) {
        return neighborhoodStations;
    }
    const fallbackNeighborStationIds = options.fallbackNeighborStationIdsByStationId?.get(observation.stationId);
    const stationById = options.stationById;
    if (!fallbackNeighborStationIds || fallbackNeighborStationIds.length === 0) {
        return neighborhoodStations;
    }
    if (!stationById) {
        return neighborhoodStations;
    }
    const supplementedStations = [...neighborhoodStations];
    const seenStationIds = new Set(supplementedStations.map((station) => station.stationId));
    // ponytail: fallback 只补静态最近 4 站；若当前帧可用站仍不足 4，继续按原口径放行。
    for (const stationId of fallbackNeighborStationIds) {
        if (stationId === observation.stationId || seenStationIds.has(stationId)) {
            continue;
        }
        const station = stationById.get(stationId);
        if (!station) {
            continue;
        }
        supplementedStations.push(station);
        seenStationIds.add(stationId);
        if (supplementedStations.length >= 4) {
            break;
        }
    }
    return supplementedStations;
}
function resolveLegendBinIndex(bins, value) {
    if (value < bins[0].min) {
        return 0;
    }
    for (let index = 0; index < bins.length; index += 1) {
        const bin = bins[index];
        const inOpenEndedRange = bin.max === null && value >= bin.min;
        const inClosedOpenRange = bin.max !== null && value >= bin.min && value < bin.max;
        if (inOpenEndedRange || inClosedOpenRange) {
            return index;
        }
    }
    return bins.length - 1;
}
function getDistanceMeters(left, right) {
    const earthRadiusMeters = 6_371_000;
    const dLat = degreesToRadians(right.latitude - left.latitude);
    const dLon = degreesToRadians(right.longitude - left.longitude);
    const leftLat = degreesToRadians(left.latitude);
    const rightLat = degreesToRadians(right.latitude);
    const haversine = Math.sin(dLat / 2) ** 2 +
        Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(dLon / 2) ** 2;
    return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}
function degreesToRadians(degrees) {
    return (degrees * Math.PI) / 180;
}
