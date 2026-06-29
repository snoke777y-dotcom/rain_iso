export function resolveNearestAnchorRef(options: {
  gridId: number;
  hardAnchorMask: Uint8Array;
  valueGrid: Float32Array;
  gridCenterX: Float32Array;
  gridCenterY: Float32Array;
}): number | null {
  let bestGridId: number | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < options.hardAnchorMask.length; index += 1) {
    if (options.hardAnchorMask[index] !== 1) {
      continue;
    }

    const dx = options.gridCenterX[index] - options.gridCenterX[options.gridId];
    const dy = options.gridCenterY[index] - options.gridCenterY[options.gridId];
    const distanceSquared = dx * dx + dy * dy;

    if (
      distanceSquared < bestDistance ||
      (distanceSquared === bestDistance &&
        bestGridId !== null &&
        options.valueGrid[index] > options.valueGrid[bestGridId])
    ) {
      bestDistance = distanceSquared;
      bestGridId = index;
    }
  }

  return bestGridId === null ? null : options.valueGrid[bestGridId];
}
