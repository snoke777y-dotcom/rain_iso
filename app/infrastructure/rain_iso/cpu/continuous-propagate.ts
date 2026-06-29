export function continuousPropagate(input: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  knownMask: Uint8Array;
  hardAnchorMask: Uint8Array;
  gridNeighbors: Int32Array;
  gridCenterX: Float32Array;
  gridCenterY: Float32Array;
  ordinaryOnlyMode: boolean;
}): {
  valueGrid: Float32Array;
  knownMask: Uint8Array;
} {
  const valueGrid = new Float32Array(input.valueGrid);
  const knownMask = new Uint8Array(input.knownMask);
  const gridCount = valueGrid.length;

  let changed = true;
  while (changed) {
    changed = false;

    for (let gridId = 0; gridId < gridCount; gridId += 1) {
      if (input.rainMask[gridId] === 0 || knownMask[gridId] === 1) {
        continue;
      }

      const ordinaryNeighbors: number[] = [];
      const anchorNeighbors: number[] = [];
      for (let offset = 0; offset < 8; offset += 1) {
        const neighborId = input.gridNeighbors[gridId * 8 + offset];
        if (neighborId < 0 || knownMask[neighborId] === 0) {
          continue;
        }

        const target = input.hardAnchorMask[neighborId] === 1
          ? anchorNeighbors
          : ordinaryNeighbors;
        target.push(valueGrid[neighborId]);
      }

      const candidates = ordinaryNeighbors.length > 0
        ? ordinaryNeighbors
        : anchorNeighbors;
      if (candidates.length === 0) {
        continue;
      }

      valueGrid[gridId] = median(candidates);
      knownMask[gridId] = 1;
      changed = true;
    }
  }

  return {
    valueGrid,
    knownMask
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}
