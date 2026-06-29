export function applyRenderThreshold(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  threshold?: number;
}): {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
} {
  const threshold = options.threshold ?? 0.1;
  const valueGrid = new Float32Array(options.valueGrid);
  const rainMask = new Uint8Array(options.rainMask);

  for (let gridId = 0; gridId < valueGrid.length; gridId += 1) {
    if (rainMask[gridId] !== 1) {
      valueGrid[gridId] = Number.NaN;
      continue;
    }

    if (valueGrid[gridId] < threshold) {
      valueGrid[gridId] = Number.NaN;
      rainMask[gridId] = 0;
    }
  }

  return {
    valueGrid,
    rainMask
  };
}
