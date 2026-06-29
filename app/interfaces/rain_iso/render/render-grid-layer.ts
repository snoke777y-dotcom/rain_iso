import { RENDER_THRESHOLD_MM } from "../../../domain/rain_iso/constants.js";
import { resolveLegendBin } from "../../../domain/rain_iso/legend.js";
import type { GridMetaColumns } from "../../../infrastructure/rain_iso/assets/asset-types.js";
import type { FrameResult } from "../../../domain/rain_iso/models.js";
import { buildColorRamp } from "./build-color-ramp.js";

type RenderSampleField = {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  transitionValueGrid?: Float32Array;
  transitionMask?: Uint8Array;
};

export function renderGridLayer(options: {
  frameResult: FrameResult;
  gridMeta: GridMetaColumns;
  pixelScale?: number;
  renderBoundary?: Record<string, unknown>;
  gridResolutionM?: number;
}) {
  const sourceWidth = getMaxValue(options.gridMeta.col) + 1;
  const sourceHeight = getMaxValue(options.gridMeta.row) + 1;
  const pixelScale = Math.max(1, Math.floor(options.pixelScale ?? 1));
  const width = (sourceWidth - 1) * pixelScale + 1;
  const height = (sourceHeight - 1) * pixelScale + 1;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const legend = buildColorRamp(options.frameResult.frameType);
  const displayBoundary = resolveDisplayBoundary(options.renderBoundary);
  const gridIndexByCell = new Map<string, number>();

  for (let gridIndex = 0; gridIndex < options.gridMeta.gridId.length; gridIndex += 1) {
    const row = options.gridMeta.row[gridIndex];
    const col = options.gridMeta.col[gridIndex];
    gridIndexByCell.set(toCellKey(row, col), gridIndex);
  }

  const renderField: RenderSampleField =
    pixelScale > 1
      ? buildBridgeRenderField({
          frameResult: {
            ...options.frameResult,
            rainMask: options.frameResult.rainMask
          },
          gridMeta: options.gridMeta,
          gridIndexByCell,
          legend
        })
      : {
          valueGrid: options.frameResult.valueGrid,
          rainMask: options.frameResult.rainMask
        };

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const value = sampleInterpolatedValue({
        valueGrid: renderField.valueGrid,
        rainMask: renderField.rainMask,
        baseValueGrid: options.frameResult.valueGrid,
        baseRainMask: options.frameResult.rainMask,
        transitionValueGrid: renderField.transitionValueGrid,
        transitionMask: renderField.transitionMask,
        gridIndexByCell,
        sourceRow: row / pixelScale,
        sourceCol: col / pixelScale,
        legend,
        pixelScale
      });
      const bin = resolveLegendBin(
        {
          legendId: options.frameResult.legendId,
          productType: options.frameResult.frameType,
          bins: legend
        },
        value
      );
      if (!bin) {
        continue;
      }

      const pixelOffset = (row * width + col) * 4;
      const rampEntry = legend.find((entry) => entry.color === bin.color);
      const rgba = rampEntry?.rgba ?? [0, 0, 0, 0];
      pixels[pixelOffset] = rgba[0];
      pixels[pixelOffset + 1] = rgba[1];
      pixels[pixelOffset + 2] = rgba[2];
      pixels[pixelOffset + 3] = rgba[3];
    }
  }

  if (pixelScale > 1) {
    smoothGridCenterPixels({
      pixels,
      width,
      height,
      pixelScale,
      sourceWidth,
      sourceHeight,
      gridIndexByCell,
      rainMask: renderField.rainMask,
      valueGrid: renderField.valueGrid,
      legend,
      legendId: options.frameResult.legendId,
      frameType: options.frameResult.frameType
    });
  }

  drawBoundaryOverlay({
    pixels,
    width,
    height,
    pixelScale,
    gridMeta: options.gridMeta,
    renderBoundary: displayBoundary,
    gridResolutionM: options.gridResolutionM
  });

  return {
    frameKey: options.frameResult.frameKey,
    legendId: options.frameResult.legendId,
    width,
    height,
    pixels,
    getPixel(gridIndex: number) {
      const row = options.gridMeta.row[gridIndex];
      const col = options.gridMeta.col[gridIndex];
      const offset = ((row * pixelScale) * width + col * pixelScale) * 4;
      return pixels.slice(offset, offset + 4);
    },
    queryGridValue(row: number, col: number) {
      const gridIndex = gridIndexByCell.get(toCellKey(row, col));
      if (gridIndex === undefined) {
        return null;
      }

      if (options.frameResult.rainMask[gridIndex] !== 1) {
        return null;
      }

      return options.frameResult.valueGrid[gridIndex];
    }
  };
}

function resolveDisplayBoundary(renderBoundary?: Record<string, unknown>) {
  if (!renderBoundary) {
    return undefined;
  }

  const features = Array.isArray((renderBoundary as { features?: unknown[] }).features)
    ? (renderBoundary as { features: Array<Record<string, unknown>> }).features
    : [];
  const cityFeatures = features.filter((feature) => isBeijingFeature(feature));
  if (cityFeatures.length === 0) {
    return renderBoundary;
  }

  return {
    ...renderBoundary,
    features: cityFeatures
  };
}

function toCellKey(row: number, col: number) {
  return `${row}:${col}`;
}

function sampleInterpolatedValue(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  baseValueGrid: Float32Array;
  baseRainMask: Uint8Array;
  transitionValueGrid?: Float32Array;
  transitionMask?: Uint8Array;
  gridIndexByCell: Map<string, number>;
  sourceRow: number;
  sourceCol: number;
  legend: ReturnType<typeof buildColorRamp>;
  pixelScale: number;
}) {
  const exactGridIndex =
    Number.isInteger(options.sourceRow) && Number.isInteger(options.sourceCol)
      ? options.gridIndexByCell.get(toCellKey(options.sourceRow, options.sourceCol))
      : undefined;
  if (exactGridIndex !== undefined) {
    if (options.pixelScale === 1) {
      if (options.rainMask[exactGridIndex] === 1) {
        return options.valueGrid[exactGridIndex];
      }
      return Number.NaN;
    }

    if (
      options.rainMask[exactGridIndex] !== 1 ||
      resolveBinIndex(options.legend, options.valueGrid[exactGridIndex]) < 0
    ) {
      return Number.NaN;
    }

    return sampleGridCenterBlendedValue(options);
  }

  return sampleInterpolatedValueOffCenter(options);
}

function smoothGridCenterPixels(options: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  pixelScale: number;
  sourceWidth: number;
  sourceHeight: number;
  gridIndexByCell: Map<string, number>;
  rainMask: Uint8Array;
  valueGrid: Float32Array;
  legend: ReturnType<typeof buildColorRamp>;
  legendId: FrameResult["legendId"];
  frameType: FrameResult["frameType"];
}) {
  for (let sourceRow = 0; sourceRow < options.sourceHeight; sourceRow += 1) {
    for (let sourceCol = 0; sourceCol < options.sourceWidth; sourceCol += 1) {
      const gridIndex = options.gridIndexByCell.get(toCellKey(sourceRow, sourceCol));
      if (gridIndex === undefined || options.rainMask[gridIndex] !== 1) {
        continue;
      }

      if (
        !resolveLegendBin(
          {
            legendId: options.legendId,
            productType: options.frameType,
            bins: options.legend
          },
          options.valueGrid[gridIndex]
        )
      ) {
        continue;
      }

      const pixelRow = sourceRow * options.pixelScale;
      const pixelCol = sourceCol * options.pixelScale;
      const replacementOffset = pickCenterReplacementOffset({
        width: options.width,
        height: options.height,
        pixelRow,
        pixelCol
      });
      if (replacementOffset === null) {
        continue;
      }

      const centerOffset = (pixelRow * options.width + pixelCol) * 4;
      options.pixels[centerOffset] = options.pixels[replacementOffset];
      options.pixels[centerOffset + 1] = options.pixels[replacementOffset + 1];
      options.pixels[centerOffset + 2] = options.pixels[replacementOffset + 2];
      options.pixels[centerOffset + 3] = options.pixels[replacementOffset + 3];
    }
  }
}

function pickCenterReplacementOffset(options: {
  width: number;
  height: number;
  pixelRow: number;
  pixelCol: number;
}) {
  const candidates = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ] as const;

  for (const [rowOffset, colOffset] of candidates) {
    const row = options.pixelRow + rowOffset;
    const col = options.pixelCol + colOffset;
    if (row < 0 || row >= options.height || col < 0 || col >= options.width) {
      continue;
    }
    return (row * options.width + col) * 4;
  }

  return null;
}

function sampleGridCenterBlendedValue(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  baseValueGrid: Float32Array;
  baseRainMask: Uint8Array;
  transitionValueGrid?: Float32Array;
  transitionMask?: Uint8Array;
  gridIndexByCell: Map<string, number>;
  sourceRow: number;
  sourceCol: number;
  legend: ReturnType<typeof buildColorRamp>;
  pixelScale: number;
}) {
  const delta = 1 / options.pixelScale;
  const sampleOffsets = [
    [-delta, -delta],
    [-delta, delta],
    [delta, -delta],
    [delta, delta]
  ] as const;
  let weightedSum = 0;
  let weight = 0;

  for (const [rowOffset, colOffset] of sampleOffsets) {
    const value = sampleInterpolatedValueOffCenter({
      ...options,
      sourceRow: options.sourceRow + rowOffset,
      sourceCol: options.sourceCol + colOffset
    });
    if (!Number.isFinite(value)) {
      continue;
    }
    weightedSum += value;
    weight += 1;
  }

  if (weight > 0) {
    return weightedSum / weight;
  }

  return Number.NaN;
}

function sampleInterpolatedValueOffCenter(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  baseValueGrid: Float32Array;
  baseRainMask: Uint8Array;
  transitionValueGrid?: Float32Array;
  transitionMask?: Uint8Array;
  gridIndexByCell: Map<string, number>;
  sourceRow: number;
  sourceCol: number;
  legend: ReturnType<typeof buildColorRamp>;
  pixelScale: number;
}) {
  const baseRow = Math.floor(options.sourceRow);
  const baseCol = Math.floor(options.sourceCol);
  const nextRow = Math.ceil(options.sourceRow);
  const nextCol = Math.ceil(options.sourceCol);
  const rowWeight = options.sourceRow - baseRow;
  const colWeight = options.sourceCol - baseCol;

  const corners: Array<{
    row: number;
    col: number;
    weight: number;
  }> = [
    { row: baseRow, col: baseCol, weight: (1 - rowWeight) * (1 - colWeight) },
    { row: baseRow, col: nextCol, weight: (1 - rowWeight) * colWeight },
    { row: nextRow, col: baseCol, weight: rowWeight * (1 - colWeight) },
    { row: nextRow, col: nextCol, weight: rowWeight * colWeight }
  ];

  let maxValue = Number.NEGATIVE_INFINITY;
  let weightedValue = 0;
  const cornerBinIndices: number[] = [];
  const cornerPeakWeighted = {
    weightedSum: 0,
    totalWeight: 0
  };
  let transitionWeightedSum = 0;
  let transitionWeight = 0;
  const rainyCornerGridIds = new Set<number>();

  for (const corner of corners) {
    if (corner.weight <= 0) {
      continue;
    }

    const gridIndex = options.gridIndexByCell.get(toCellKey(corner.row, corner.col));
    if (gridIndex === undefined) {
      continue;
    }

    const value = readDisplayFieldValue({
      gridIndex,
      valueGrid: options.valueGrid,
      rainMask: options.rainMask,
      transitionValueGrid: options.transitionValueGrid,
      transitionMask: options.transitionMask
    });
    if (!Number.isFinite(value)) {
      continue;
    }

    const isTransitionCorner =
      options.rainMask[gridIndex] !== 1 && options.transitionMask?.[gridIndex] === 1;
    const binIndex = resolveBinIndex(options.legend, value);
    cornerBinIndices.push(binIndex);
    if (value > maxValue) {
      maxValue = value;
    }
    weightedValue += value * corner.weight;
    if (isTransitionCorner) {
      transitionWeightedSum += value * corner.weight;
      transitionWeight += corner.weight;
    } else {
      rainyCornerGridIds.add(gridIndex);
    }
    if (binIndex > -1) {
      cornerPeakWeighted.weightedSum += value * corner.weight;
      cornerPeakWeighted.totalWeight += corner.weight;
    }
  }

  if (transitionWeight > 0 && rainyCornerGridIds.size <= 1) {
    return transitionWeightedSum / transitionWeight;
  }

  if (!Number.isFinite(maxValue)) {
    return sampleLowBinFeatheredValue({
      valueGrid: options.valueGrid,
      rainMask: options.rainMask,
      transitionValueGrid: options.transitionValueGrid,
      transitionMask: options.transitionMask,
      gridIndexByCell: options.gridIndexByCell,
      sourceRow: options.sourceRow,
      sourceCol: options.sourceCol,
      legend: options.legend,
      fallbackValue: Number.NaN
    });
  }

  const relativePeakBin = findRelativePeakBin(cornerBinIndices);
  if (relativePeakBin >= 0) {
    const relativePeakValue = sampleCornerPeakValue({
      corners,
      relativePeakBin,
      valueGrid: options.valueGrid,
      rainMask: options.rainMask,
      gridIndexByCell: options.gridIndexByCell,
      legend: options.legend
    });
    if (Number.isFinite(relativePeakValue)) {
      return relativePeakValue;
    }
  }

  const maxBinIndex = resolveBinIndex(options.legend, maxValue);
  if (shouldPreserveAbsolutePeakBin(maxBinIndex, options.legend.length)) {
    return maxValue;
  }

  return sampleLowBinFeatheredValue({
    valueGrid: options.valueGrid,
    rainMask: options.rainMask,
    transitionValueGrid: options.transitionValueGrid,
    transitionMask: options.transitionMask,
    gridIndexByCell: options.gridIndexByCell,
    sourceRow: options.sourceRow,
    sourceCol: options.sourceCol,
    legend: options.legend,
    fallbackValue: weightedValue
  });
}

function getMaxValue(values: Int32Array): number {
  let max = -1;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] > max) {
      max = values[index];
    }
  }
  return max;
}

function drawBoundaryOverlay(options: {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  pixelScale: number;
  gridMeta: GridMetaColumns;
  renderBoundary?: Record<string, unknown>;
  gridResolutionM?: number;
}) {
  if (!options.renderBoundary) {
    return;
  }

  const transform = inferGridTransform(options.gridMeta, options.gridResolutionM);
  if (!transform) {
    return;
  }

  for (const ring of collectBoundaryRings(options.renderBoundary)) {
    for (let index = 1; index < ring.length; index += 1) {
      const start = projectLonLatToPixel(ring[index - 1], transform, options.pixelScale);
      const end = projectLonLatToPixel(ring[index], transform, options.pixelScale);
      drawLine(options.pixels, options.width, options.height, start, end);
    }
  }
}

function inferGridTransform(
  gridMeta: GridMetaColumns,
  fallbackResolutionM?: number
) {
  const colStep = inferAxisStep(
    gridMeta.centerX,
    gridMeta.col,
    gridMeta.row,
    fallbackResolutionM,
    "row"
  );
  const rowStep = inferAxisStep(
    gridMeta.centerY,
    gridMeta.row,
    gridMeta.col,
    fallbackResolutionM ? -fallbackResolutionM : undefined,
    "col"
  );
  if (!Number.isFinite(colStep) || !Number.isFinite(rowStep) || colStep === 0 || rowStep === 0) {
    return null;
  }

  return {
    originX: gridMeta.centerX[0] - (gridMeta.col[0] + 0.5) * colStep,
    originY: gridMeta.centerY[0] - (gridMeta.row[0] + 0.5) * rowStep,
    colStep,
    rowStep
  };
}

function inferAxisStep(
  values: Float32Array,
  primaryAxis: Int32Array,
  secondaryAxis: Int32Array,
  fallback: number | undefined,
  secondaryName: "row" | "col"
) {
  for (let index = 0; index < values.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < values.length; compareIndex += 1) {
      if (secondaryAxis[index] !== secondaryAxis[compareIndex]) {
        continue;
      }

      const axisDelta = primaryAxis[compareIndex] - primaryAxis[index];
      if (axisDelta === 0) {
        continue;
      }

      const valueDelta = values[compareIndex] - values[index];
      const step = valueDelta / axisDelta;
      if (Number.isFinite(step) && step !== 0) {
        return step;
      }
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }

  return secondaryName === "row" ? 1 : -1;
}

function collectBoundaryRings(renderBoundary: Record<string, unknown>) {
  const rings: number[][][] = [];
  const features = Array.isArray((renderBoundary as { features?: unknown[] }).features)
    ? (renderBoundary as { features: Array<{ geometry?: { type?: string; coordinates?: unknown } }> }).features
    : [];

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) {
      continue;
    }

    if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
      for (const ring of geometry.coordinates) {
        if (Array.isArray(ring)) {
          rings.push(ring as number[][]);
        }
      }
      continue;
    }

    if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
      for (const polygon of geometry.coordinates) {
        if (!Array.isArray(polygon)) {
          continue;
        }
        for (const ring of polygon) {
          if (Array.isArray(ring)) {
            rings.push(ring as number[][]);
          }
        }
      }
    }
  }

  return rings;
}

function buildDisplayRainMask(options: {
  rainMask: Uint8Array;
  gridMeta: GridMetaColumns;
  renderBoundary?: Record<string, unknown>;
}) {
  if (!options.renderBoundary) {
    return options.rainMask;
  }

  const polygons = collectBoundaryPolygons(options.renderBoundary);
  if (polygons.length === 0) {
    return options.rainMask;
  }

  const displayRainMask = new Uint8Array(options.rainMask);
  for (let gridIndex = 0; gridIndex < displayRainMask.length; gridIndex += 1) {
    if (displayRainMask[gridIndex] !== 1) {
      continue;
    }

    const point = webMercatorToLonLat(
      options.gridMeta.centerX[gridIndex],
      options.gridMeta.centerY[gridIndex]
    );
    if (!boundaryContainsPoint(polygons, point.lon, point.lat)) {
      displayRainMask[gridIndex] = 0;
    }
  }

  return displayRainMask;
}

function collectBoundaryPolygons(renderBoundary: Record<string, unknown>) {
  const polygons: number[][][][] = [];
  const features = Array.isArray((renderBoundary as { features?: unknown[] }).features)
    ? (renderBoundary as { features: Array<{ geometry?: { type?: string; coordinates?: unknown } }> }).features
    : [];

  for (const feature of features) {
    const geometry = feature.geometry;
    if (!geometry) {
      continue;
    }

    if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
      polygons.push(geometry.coordinates as number[][][]);
      continue;
    }

    if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
      for (const polygon of geometry.coordinates) {
        if (Array.isArray(polygon)) {
          polygons.push(polygon as number[][][]);
        }
      }
    }
  }

  return polygons;
}

function boundaryContainsPoint(polygons: number[][][][], lon: number, lat: number) {
  return polygons.some((polygon) => polygonContainsPoint(polygon, lon, lat));
}

function polygonContainsPoint(polygon: number[][][], lon: number, lat: number) {
  if (!ringContainsPoint(polygon[0] ?? [], lon, lat)) {
    return false;
  }

  for (let index = 1; index < polygon.length; index += 1) {
    if (ringContainsPoint(polygon[index], lon, lat)) {
      return false;
    }
  }

  return true;
}

function ringContainsPoint(ring: number[][], lon: number, lat: number) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previous];
    const intersects =
      (y1 > lat) !== (y2 > lat) &&
      lon < ((x2 - x1) * (lat - y1)) / ((y2 - y1) || Number.EPSILON) + x1;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function projectLonLatToPixel(
  point: number[],
  transform: {
    originX: number;
    originY: number;
    colStep: number;
    rowStep: number;
  },
  pixelScale: number
) {
  const projected = lonLatToWebMercator(point[0], point[1]);
  const sourceCol = (projected.x - transform.originX) / transform.colStep - 0.5;
  const sourceRow = (projected.y - transform.originY) / transform.rowStep - 0.5;
  return {
    x: Math.round(sourceCol * pixelScale),
    y: Math.round(sourceRow * pixelScale)
  };
}

function lonLatToWebMercator(lon: number, lat: number) {
  const earthRadius = 6378137;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const radians = Math.PI / 180;
  return {
    x: earthRadius * lon * radians,
    y: earthRadius * Math.log(Math.tan(Math.PI / 4 + (clampedLat * radians) / 2))
  };
}

function webMercatorToLonLat(x: number, y: number) {
  const lon = (x / 20037508.34) * 180;
  const lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((y / 20037508.34) * Math.PI)) - Math.PI / 2);
  return { lon, lat };
}

function isBeijingFeature(feature: Record<string, unknown>) {
  const properties = (feature.properties ?? {}) as Record<string, unknown>;
  return properties.xzqhdm === "110000" || properties.adcode === 110000;
}

function drawLine(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  let x = start.x;
  let y = start.y;
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    paintPixel(pixels, width, height, x, y);
    if (x === end.x && y === end.y) {
      return;
    }

    const doubledError = error * 2;
    if (doubledError > -deltaY) {
      error -= deltaY;
      x += stepX;
    }
    if (doubledError < deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}

function paintPixel(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }

  const offset = (y * width + x) * 4;
  pixels[offset] = 0;
  pixels[offset + 1] = 0;
  pixels[offset + 2] = 0;
  pixels[offset + 3] = 255;
}

const BRIDGE_MAX_GAP_CELLS = 2;
const BRIDGE_MAX_SPAN = BRIDGE_MAX_GAP_CELLS + 1;
const ISOLATED_LOW_BIN_MAX_INDEX = 1;
const ISOLATED_PATCH_MAX_CELLS = 3;
const ISOLATED_SUPPORT_RADIUS = 2;
const STRONGER_SUPPORT_RADIUS = 2;

function buildBridgeRenderField(options: {
  frameResult: FrameResult;
  gridMeta: GridMetaColumns;
  gridIndexByCell: Map<string, number>;
  legend: ReturnType<typeof buildColorRamp>;
}) {
  const valueGrid = new Float32Array(options.frameResult.valueGrid);
  const rainMask = new Uint8Array(options.frameResult.rainMask);
  const binIndexByGrid = new Int16Array(valueGrid.length).fill(-1);
  const localPeakMask = new Uint8Array(valueGrid.length);

  for (let gridIndex = 0; gridIndex < valueGrid.length; gridIndex += 1) {
    if (rainMask[gridIndex] !== 1) {
      continue;
    }

    binIndexByGrid[gridIndex] = resolveBinIndex(options.legend, valueGrid[gridIndex]);
  }

  for (let gridIndex = 0; gridIndex < valueGrid.length; gridIndex += 1) {
    const binIndex = binIndexByGrid[gridIndex];
    if (binIndex < 0) {
      continue;
    }

    const row = options.gridMeta.row[gridIndex];
    const col = options.gridMeta.col[gridIndex];
    if (
      binIndex ===
      findLocalMaxBinIndex({
        row,
        col,
        radius: BRIDGE_MAX_SPAN,
        binIndexByGrid,
        gridIndexByCell: options.gridIndexByCell
      })
    ) {
      localPeakMask[gridIndex] = 1;
    }
  }

  for (let gridIndex = 0; gridIndex < valueGrid.length; gridIndex += 1) {
    if (localPeakMask[gridIndex] !== 1) {
      continue;
    }

    const row = options.gridMeta.row[gridIndex];
    const col = options.gridMeta.col[gridIndex];
    const binIndex = binIndexByGrid[gridIndex];

    for (let rowOffset = -BRIDGE_MAX_SPAN; rowOffset <= BRIDGE_MAX_SPAN; rowOffset += 1) {
      for (
        let colOffset = -BRIDGE_MAX_SPAN;
        colOffset <= BRIDGE_MAX_SPAN;
        colOffset += 1
      ) {
        if (
          (rowOffset === 0 && colOffset === 0) ||
          Math.max(Math.abs(rowOffset), Math.abs(colOffset)) < 2
        ) {
          continue;
        }

        const targetGridIndex = options.gridIndexByCell.get(
          toCellKey(row + rowOffset, col + colOffset)
        );
        if (
          targetGridIndex === undefined ||
          targetGridIndex <= gridIndex ||
          localPeakMask[targetGridIndex] !== 1 ||
          binIndexByGrid[targetGridIndex] !== binIndex
        ) {
          continue;
        }

        const bridgeValue = Math.max(valueGrid[gridIndex], valueGrid[targetGridIndex]);
        const bridgeGridIndices = collectBridgePath({
          startRow: row,
          startCol: col,
          targetRow: row + rowOffset,
          targetCol: col + colOffset,
          gridIndexByCell: options.gridIndexByCell
        });
        for (const bridgeGridIndex of bridgeGridIndices) {
          if (bridgeValue > valueGrid[bridgeGridIndex]) {
            valueGrid[bridgeGridIndex] = bridgeValue;
          }
          rainMask[bridgeGridIndex] = 1;
        }
      }
    }
  }

  for (let gridIndex = 0; gridIndex < valueGrid.length; gridIndex += 1) {
    if (rainMask[gridIndex] !== 1) {
      binIndexByGrid[gridIndex] = -1;
      continue;
    }

    binIndexByGrid[gridIndex] = resolveBinIndex(options.legend, valueGrid[gridIndex]);
  }

  suppressIsolatedLowPatches({
    rainMask,
    hardAnchorMask: options.frameResult.hardAnchorMask,
    binIndexByGrid,
    gridMeta: options.gridMeta,
    gridIndexByCell: options.gridIndexByCell
  });
  const transitionField = buildSmallPatchTransitionField({
    valueGrid,
    rainMask,
    gridMeta: options.gridMeta,
    gridIndexByCell: options.gridIndexByCell,
    legend: options.legend
  });

  return {
    valueGrid,
    rainMask,
    transitionValueGrid: transitionField.valueGrid,
    transitionMask: transitionField.rainMask
  };
}

function buildSmallPatchTransitionField(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  gridMeta: GridMetaColumns;
  gridIndexByCell: Map<string, number>;
  legend: ReturnType<typeof buildColorRamp>;
}) {
  const transitionValueGrid = new Float32Array(options.valueGrid.length);
  const transitionMask = new Uint8Array(options.valueGrid.length);
  const visited = new Uint8Array(options.rainMask.length);

  for (let gridIndex = 0; gridIndex < options.rainMask.length; gridIndex += 1) {
    if (visited[gridIndex] === 1 || options.rainMask[gridIndex] !== 1) {
      continue;
    }

    const patch = collectRainPatch({
      startGridIndex: gridIndex,
      visited,
      rainMask: options.rainMask,
      gridMeta: options.gridMeta,
      gridIndexByCell: options.gridIndexByCell
    });
    if (patch.length === 0 || patch.length > ISOLATED_PATCH_MAX_CELLS) {
      continue;
    }

    for (const patchGridIndex of patch) {
      const sourceRow = options.gridMeta.row[patchGridIndex];
      const sourceCol = options.gridMeta.col[patchGridIndex];
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          const neighborGridIndex = options.gridIndexByCell.get(
            toCellKey(sourceRow + rowOffset, sourceCol + colOffset)
          );
          if (
            neighborGridIndex === undefined ||
            options.rainMask[neighborGridIndex] === 1
          ) {
            continue;
          }

          const candidateValue = resolvePatchTransitionValue({
            sourceValue: options.valueGrid[patchGridIndex],
            legend: options.legend,
            distance: Math.hypot(rowOffset, colOffset)
          });
          if (!Number.isFinite(candidateValue)) {
            continue;
          }

          if (
            transitionMask[neighborGridIndex] !== 1 ||
            candidateValue > transitionValueGrid[neighborGridIndex]
          ) {
            transitionMask[neighborGridIndex] = 1;
            transitionValueGrid[neighborGridIndex] = candidateValue;
          }
        }
      }
    }
  }

  return {
    valueGrid: transitionValueGrid,
    rainMask: transitionMask
  };
}

function collectRainPatch(options: {
  startGridIndex: number;
  visited: Uint8Array;
  rainMask: Uint8Array;
  gridMeta: GridMetaColumns;
  gridIndexByCell: Map<string, number>;
}) {
  const patch: number[] = [];
  const queue = [options.startGridIndex];
  options.visited[options.startGridIndex] = 1;

  while (queue.length > 0) {
    const currentGridIndex = queue.shift();
    if (currentGridIndex === undefined) {
      continue;
    }

    patch.push(currentGridIndex);
    const row = options.gridMeta.row[currentGridIndex];
    const col = options.gridMeta.col[currentGridIndex];
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const neighborGridIndex = options.gridIndexByCell.get(
          toCellKey(row + rowOffset, col + colOffset)
        );
        if (
          neighborGridIndex === undefined ||
          options.visited[neighborGridIndex] === 1 ||
          options.rainMask[neighborGridIndex] !== 1
        ) {
          continue;
        }

        options.visited[neighborGridIndex] = 1;
        queue.push(neighborGridIndex);
      }
    }
  }

  return patch;
}

function resolvePatchTransitionValue(options: {
  sourceValue: number;
  legend: ReturnType<typeof buildColorRamp>;
  distance: number;
}) {
  const sourceBinIndex = resolveBinIndex(options.legend, options.sourceValue);
  if (sourceBinIndex < 0) {
    return Number.NaN;
  }

  if (sourceBinIndex === 0) {
    return Math.max(
      RENDER_THRESHOLD_MM,
      (options.sourceValue + RENDER_THRESHOLD_MM) / 2
    );
  }

  const fallbackBin = options.legend[sourceBinIndex - 1];
  if (!fallbackBin) {
    return Number.NaN;
  }

  const fallbackValue =
    fallbackBin.max === null
      ? fallbackBin.min
      : (fallbackBin.min + fallbackBin.max) / 2;
  const distanceDecay = options.distance > 1 ? 0.85 : 1;
  return Math.min(options.sourceValue - Number.EPSILON, fallbackValue * distanceDecay);
}

function readDisplayFieldValue(options: {
  gridIndex: number;
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  transitionValueGrid?: Float32Array;
  transitionMask?: Uint8Array;
}) {
  if (options.rainMask[options.gridIndex] === 1) {
    return options.valueGrid[options.gridIndex];
  }

  if (
    options.transitionMask?.[options.gridIndex] === 1 &&
    options.transitionValueGrid
  ) {
    return options.transitionValueGrid[options.gridIndex];
  }

  return Number.NaN;
}

function resolveBinIndex(
  legend: ReturnType<typeof buildColorRamp>,
  value: number
): number {
  for (let index = 0; index < legend.length; index += 1) {
    const bin = legend[index];
    const inOpenEndedRange = bin.max === null && value >= bin.min;
    const inClosedOpenRange = bin.max !== null && value >= bin.min && value < bin.max;

    if (inOpenEndedRange || inClosedOpenRange) {
      return index;
    }
  }

  return -1;
}

function findRelativePeakBin(binIndices: number[]) {
  const uniqueBinIndices = Array.from(new Set(binIndices.filter((binIndex) => binIndex >= 0))).sort(
    (left, right) => right - left
  );
  if (uniqueBinIndices.length < 2) {
    return -1;
  }

  return uniqueBinIndices[0] > uniqueBinIndices[1] ? uniqueBinIndices[0] : -1;
}

function shouldPreserveAbsolutePeakBin(binIndex: number, legendLength: number) {
  return binIndex >= Math.floor(legendLength / 2);
}

function sampleCornerPeakValue(options: {
  corners: Array<{ row: number; col: number; weight: number }>;
  relativePeakBin: number;
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  gridIndexByCell: Map<string, number>;
  legend: ReturnType<typeof buildColorRamp>;
}) {
  let peakWeightedSum = 0;
  let peakWeight = 0;

  for (const corner of options.corners) {
    if (corner.weight <= 0) {
      continue;
    }

    const gridIndex = options.gridIndexByCell.get(toCellKey(corner.row, corner.col));
    if (gridIndex === undefined || options.rainMask[gridIndex] !== 1) {
      continue;
    }

    const value = options.valueGrid[gridIndex];
    if (resolveBinIndex(options.legend, value) !== options.relativePeakBin) {
      continue;
    }

    peakWeightedSum += value * corner.weight;
    peakWeight += corner.weight;
  }

  if (peakWeight <= 0) {
    return Number.NaN;
  }

  return peakWeightedSum / peakWeight;
}

function hasStrongerNeighborSupport(options: {
  row: number;
  col: number;
  currentBinIndex: number;
  rainMask: Uint8Array;
  valueGrid: Float32Array;
  gridIndexByCell: Map<string, number>;
  legend: ReturnType<typeof buildColorRamp>;
}) {
  for (
    let rowOffset = -STRONGER_SUPPORT_RADIUS;
    rowOffset <= STRONGER_SUPPORT_RADIUS;
    rowOffset += 1
  ) {
    for (
      let colOffset = -STRONGER_SUPPORT_RADIUS;
      colOffset <= STRONGER_SUPPORT_RADIUS;
      colOffset += 1
    ) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const neighborGridIndex = options.gridIndexByCell.get(
        toCellKey(options.row + rowOffset, options.col + colOffset)
      );
      if (
        neighborGridIndex === undefined ||
        options.rainMask[neighborGridIndex] !== 1
      ) {
        continue;
      }

      const neighborBinIndex = resolveBinIndex(
        options.legend,
        options.valueGrid[neighborGridIndex]
      );
      if (neighborBinIndex > options.currentBinIndex) {
        return true;
      }
    }
  }

  return false;
}

function hasComparableNeighborSupport(options: {
  row: number;
  col: number;
  currentBinIndex: number;
  rainMask: Uint8Array;
  valueGrid: Float32Array;
  gridIndexByCell: Map<string, number>;
  legend: ReturnType<typeof buildColorRamp>;
}) {
  for (
    let rowOffset = -STRONGER_SUPPORT_RADIUS;
    rowOffset <= STRONGER_SUPPORT_RADIUS;
    rowOffset += 1
  ) {
    for (
      let colOffset = -STRONGER_SUPPORT_RADIUS;
      colOffset <= STRONGER_SUPPORT_RADIUS;
      colOffset += 1
    ) {
      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const neighborGridIndex = options.gridIndexByCell.get(
        toCellKey(options.row + rowOffset, options.col + colOffset)
      );
      if (
        neighborGridIndex === undefined ||
        options.rainMask[neighborGridIndex] !== 1
      ) {
        continue;
      }

      const neighborBinIndex = resolveBinIndex(
        options.legend,
        options.valueGrid[neighborGridIndex]
      );
      if (neighborBinIndex >= options.currentBinIndex) {
        return true;
      }
    }
  }

  return false;
}

function suppressIsolatedLowPatches(options: {
  rainMask: Uint8Array;
  hardAnchorMask: Uint8Array;
  binIndexByGrid: Int16Array;
  gridMeta: GridMetaColumns;
  gridIndexByCell: Map<string, number>;
}) {
  const visited = new Uint8Array(options.rainMask.length);

  for (let gridIndex = 0; gridIndex < options.rainMask.length; gridIndex += 1) {
    const binIndex = options.binIndexByGrid[gridIndex];
    if (
      visited[gridIndex] === 1 ||
      options.rainMask[gridIndex] !== 1 ||
      binIndex < 0 ||
      binIndex > ISOLATED_LOW_BIN_MAX_INDEX
    ) {
      continue;
    }

    const patch = collectSameBinPatch({
      startGridIndex: gridIndex,
      targetBinIndex: binIndex,
      visited,
      rainMask: options.rainMask,
      binIndexByGrid: options.binIndexByGrid,
      gridMeta: options.gridMeta,
      gridIndexByCell: options.gridIndexByCell
    });
    if (patch.length > ISOLATED_PATCH_MAX_CELLS) {
      continue;
    }

    if (
      patch.some((currentGridIndex) => options.hardAnchorMask[currentGridIndex] === 1) ||
      hasNearbyBinSupport({
        patch,
        patchBinIndex: binIndex,
        rainMask: options.rainMask,
        binIndexByGrid: options.binIndexByGrid,
        gridMeta: options.gridMeta,
        gridIndexByCell: options.gridIndexByCell
      })
    ) {
      continue;
    }

    for (const currentGridIndex of patch) {
      options.rainMask[currentGridIndex] = 0;
      options.binIndexByGrid[currentGridIndex] = -1;
    }
  }
}

function collectSameBinPatch(options: {
  startGridIndex: number;
  targetBinIndex: number;
  visited: Uint8Array;
  rainMask: Uint8Array;
  binIndexByGrid: Int16Array;
  gridMeta: GridMetaColumns;
  gridIndexByCell: Map<string, number>;
}) {
  const patch: number[] = [];
  const queue = [options.startGridIndex];
  options.visited[options.startGridIndex] = 1;

  while (queue.length > 0) {
    const currentGridIndex = queue.shift();
    if (currentGridIndex === undefined) {
      continue;
    }

    patch.push(currentGridIndex);
    const row = options.gridMeta.row[currentGridIndex];
    const col = options.gridMeta.col[currentGridIndex];
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const neighborGridIndex = options.gridIndexByCell.get(
          toCellKey(row + rowOffset, col + colOffset)
        );
        if (
          neighborGridIndex === undefined ||
          options.visited[neighborGridIndex] === 1 ||
          options.rainMask[neighborGridIndex] !== 1 ||
          options.binIndexByGrid[neighborGridIndex] !== options.targetBinIndex
        ) {
          continue;
        }

        options.visited[neighborGridIndex] = 1;
        queue.push(neighborGridIndex);
      }
    }
  }

  return patch;
}

function hasNearbyBinSupport(options: {
  patch: number[];
  patchBinIndex: number;
  rainMask: Uint8Array;
  binIndexByGrid: Int16Array;
  gridMeta: GridMetaColumns;
  gridIndexByCell: Map<string, number>;
}) {
  const patchSet = new Set(options.patch);

  for (const currentGridIndex of options.patch) {
    const row = options.gridMeta.row[currentGridIndex];
    const col = options.gridMeta.col[currentGridIndex];
    for (
      let rowOffset = -ISOLATED_SUPPORT_RADIUS;
      rowOffset <= ISOLATED_SUPPORT_RADIUS;
      rowOffset += 1
    ) {
      for (
        let colOffset = -ISOLATED_SUPPORT_RADIUS;
        colOffset <= ISOLATED_SUPPORT_RADIUS;
        colOffset += 1
      ) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }

        const neighborGridIndex = options.gridIndexByCell.get(
          toCellKey(row + rowOffset, col + colOffset)
        );
        if (
          neighborGridIndex === undefined ||
          patchSet.has(neighborGridIndex) ||
          options.rainMask[neighborGridIndex] !== 1
        ) {
          continue;
        }

        if (options.binIndexByGrid[neighborGridIndex] >= options.patchBinIndex) {
          return true;
        }
      }
    }
  }

  return false;
}

const LOW_BIN_FEATHER_RADIUS = 1;

function sampleLowBinFeatheredValue(options: {
  valueGrid: Float32Array;
  rainMask: Uint8Array;
  transitionValueGrid?: Float32Array;
  transitionMask?: Uint8Array;
  gridIndexByCell: Map<string, number>;
  sourceRow: number;
  sourceCol: number;
  legend: ReturnType<typeof buildColorRamp>;
  fallbackValue: number;
  radius?: number;
  preservePeakBins?: boolean;
  normalizeByRainyWeight?: boolean;
}) {
  const radius = options.radius ?? LOW_BIN_FEATHER_RADIUS;
  const featherDistance = radius + 0.5;
  const preservePeakBins = options.preservePeakBins ?? true;
  const centerRow = Math.round(options.sourceRow);
  const centerCol = Math.round(options.sourceCol);
  let weightedSum = 0;
  let totalWeight = 0;
  let rainyWeight = 0;
  const weightedSumByBin = new Map<number, number>();
  const weightByBin = new Map<number, number>();
  const binIndices: number[] = [];

  for (
    let rowOffset = -radius;
    rowOffset <= radius;
    rowOffset += 1
  ) {
    for (
      let colOffset = -radius;
      colOffset <= radius;
      colOffset += 1
    ) {
      const row = centerRow + rowOffset;
      const col = centerCol + colOffset;
      const gridIndex = options.gridIndexByCell.get(toCellKey(row, col));
      if (gridIndex === undefined) {
        continue;
      }

      const distance = Math.hypot(options.sourceRow - row, options.sourceCol - col);
      const weight = featherDistance - distance;
      if (weight <= 0) {
        continue;
      }

      totalWeight += weight;
      const value = readDisplayFieldValue({
        gridIndex,
        valueGrid: options.valueGrid,
        rainMask: options.rainMask,
        transitionValueGrid: options.transitionValueGrid,
        transitionMask: options.transitionMask
      });
      if (!Number.isFinite(value)) {
        continue;
      }
      const binIndex = resolveBinIndex(options.legend, value);
      binIndices.push(binIndex);

      weightedSum += value * weight;
      rainyWeight += weight;
      weightedSumByBin.set(binIndex, (weightedSumByBin.get(binIndex) ?? 0) + value * weight);
      weightByBin.set(binIndex, (weightByBin.get(binIndex) ?? 0) + weight);
    }
  }

  if (preservePeakBins) {
    const relativePeakBin = findRelativePeakBin(binIndices);
    if (relativePeakBin >= 0) {
      const peakWeight = weightByBin.get(relativePeakBin) ?? 0;
      if (peakWeight > 0) {
        return (weightedSumByBin.get(relativePeakBin) ?? 0) / peakWeight;
      }
    }

    const maxBinIndex = binIndices.reduce(
      (currentMax, binIndex) => (binIndex > currentMax ? binIndex : currentMax),
      -1
    );
    if (shouldPreserveAbsolutePeakBin(maxBinIndex, options.legend.length)) {
      const peakWeight = weightByBin.get(maxBinIndex) ?? 0;
      if (peakWeight > 0) {
        return (weightedSumByBin.get(maxBinIndex) ?? 0) / peakWeight;
      }
    }
  }

  if (totalWeight <= 0) {
    return options.fallbackValue;
  }

  if (rainyWeight <= 0) {
    return options.fallbackValue;
  }

  if (options.normalizeByRainyWeight) {
    return weightedSum / rainyWeight;
  }

  return weightedSum / totalWeight;
}

function findLocalMaxBinIndex(options: {
  row: number;
  col: number;
  radius: number;
  binIndexByGrid: Int16Array;
  gridIndexByCell: Map<string, number>;
}) {
  let maxBinIndex = -1;

  for (let rowOffset = -options.radius; rowOffset <= options.radius; rowOffset += 1) {
    for (let colOffset = -options.radius; colOffset <= options.radius; colOffset += 1) {
      const gridIndex = options.gridIndexByCell.get(
        toCellKey(options.row + rowOffset, options.col + colOffset)
      );
      if (gridIndex === undefined) {
        continue;
      }

      const binIndex = options.binIndexByGrid[gridIndex];
      if (binIndex > maxBinIndex) {
        maxBinIndex = binIndex;
      }
    }
  }

  return maxBinIndex;
}

function collectBridgePath(options: {
  startRow: number;
  startCol: number;
  targetRow: number;
  targetCol: number;
  gridIndexByCell: Map<string, number>;
}) {
  const path: number[] = [];
  let row = options.startRow;
  let col = options.startCol;

  while (true) {
    const rowDelta = options.targetRow - row;
    const colDelta = options.targetCol - col;
    if (rowDelta === 0 && colDelta === 0) {
      return path;
    }

    row += Math.sign(rowDelta);
    col += Math.sign(colDelta);
    if (row === options.targetRow && col === options.targetCol) {
      return path;
    }

    const gridIndex = options.gridIndexByCell.get(toCellKey(row, col));
    if (gridIndex === undefined) {
      return [];
    }

    path.push(gridIndex);
  }
}
