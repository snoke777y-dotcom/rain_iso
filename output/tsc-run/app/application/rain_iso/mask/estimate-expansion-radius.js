import { FrameType } from "../../../domain/rain_iso/models.js";
export function estimateExpansionRadius(options) {
    if (options.knownGridCount === 0) {
        return 0;
    }
    const defaultMinRadius = options.frameType === FrameType.Accum1hStep ? 6 : 3;
    const defaultMaxRadius = options.frameType === FrameType.Accum1hStep ? 20 : 10;
    const minRadius = options.minRadius ?? defaultMinRadius;
    const maxRadius = options.maxRadius ?? defaultMaxRadius;
    const densityRadius = Math.ceil(Math.sqrt(options.knownGridCount));
    const anchorSpacingRadius = estimateAnchorSpacingRadius(options);
    return clamp(Math.max(densityRadius, anchorSpacingRadius), minRadius, maxRadius);
}
function estimateAnchorSpacingRadius(options) {
    if (options.hardAnchorGridIds.length < 2) {
        return 0;
    }
    let maxNearestDistanceMeters = 0;
    for (const gridId of options.hardAnchorGridIds) {
        let nearestDistanceMeters = Number.POSITIVE_INFINITY;
        for (const candidateGridId of options.hardAnchorGridIds) {
            if (candidateGridId === gridId) {
                continue;
            }
            const dx = options.gridCenterX[candidateGridId] - options.gridCenterX[gridId];
            const dy = options.gridCenterY[candidateGridId] - options.gridCenterY[gridId];
            const distanceMeters = Math.sqrt(dx * dx + dy * dy);
            nearestDistanceMeters = Math.min(nearestDistanceMeters, distanceMeters);
        }
        if (Number.isFinite(nearestDistanceMeters)) {
            maxNearestDistanceMeters = Math.max(maxNearestDistanceMeters, nearestDistanceMeters);
        }
    }
    return Math.ceil(maxNearestDistanceMeters / 2_000);
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
