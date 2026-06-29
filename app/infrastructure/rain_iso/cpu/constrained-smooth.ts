import {
  DEFAULT_SMOOTH_ROUNDS,
  DEFAULT_SOFT_OBS_MAX_DELTA
} from "./smooth-params.js";

export function constrainedSmooth(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  hardAnchorMask: Uint8Array;
  softObsMask: Uint8Array;
  gridNeighbors: Int32Array;
  rounds?: number;
  softObsMaxDelta?: number;
}): Float32Array {
  const rounds = options.rounds ?? DEFAULT_SMOOTH_ROUNDS;
  const softObsMaxDelta = options.softObsMaxDelta ?? DEFAULT_SOFT_OBS_MAX_DELTA;
  const originalValueGrid = new Float32Array(options.valueGrid);
  let current = new Float32Array(options.valueGrid);

  for (let round = 0; round < rounds; round += 1) {
    const next = new Float32Array(current);

    for (let gridId = 0; gridId < current.length; gridId += 1) {
      if (options.rainMask[gridId] !== 1 || options.hardAnchorMask[gridId] === 1) {
        continue;
      }

      const values = [current[gridId]];
      const baseOffset = gridId * 8;
      for (let neighborIndex = 0; neighborIndex < 8; neighborIndex += 1) {
        const neighborGridId = options.gridNeighbors[baseOffset + neighborIndex];
        if (neighborGridId < 0 || options.rainMask[neighborGridId] !== 1) {
          continue;
        }
        values.push(current[neighborGridId]);
      }

      const average = values.reduce((sum, value) => sum + value, 0) / values.length;

      if (options.softObsMask[gridId] === 1) {
        const minValue = originalValueGrid[gridId];
        const maxValue = originalValueGrid[gridId] + softObsMaxDelta;
        next[gridId] = clamp(average, minValue, maxValue);
        continue;
      }

      next[gridId] = average;
    }

    current = next;
  }

  return current;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
