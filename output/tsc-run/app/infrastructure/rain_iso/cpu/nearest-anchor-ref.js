export function resolveNearestAnchorRef(options) {
    let bestGridId = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < options.hardAnchorMask.length; index += 1) {
        if (options.hardAnchorMask[index] !== 1) {
            continue;
        }
        const dx = options.gridCenterX[index] - options.gridCenterX[options.gridId];
        const dy = options.gridCenterY[index] - options.gridCenterY[options.gridId];
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < bestDistance ||
            (distanceSquared === bestDistance &&
                bestGridId !== null &&
                options.valueGrid[index] > options.valueGrid[bestGridId])) {
            bestDistance = distanceSquared;
            bestGridId = index;
        }
    }
    return bestGridId === null ? null : options.valueGrid[bestGridId];
}
