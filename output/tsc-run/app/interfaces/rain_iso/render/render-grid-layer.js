import { resolveLegendBin } from "../../../domain/rain_iso/legend.js";
import { buildColorRamp } from "./build-color-ramp.js";
export function renderGridLayer(options) {
    const sourceWidth = getMaxValue(options.gridMeta.col) + 1;
    const sourceHeight = getMaxValue(options.gridMeta.row) + 1;
    const pixelScale = Math.max(1, Math.floor(options.pixelScale ?? 1));
    const width = (sourceWidth - 1) * pixelScale + 1;
    const height = (sourceHeight - 1) * pixelScale + 1;
    const pixels = new Uint8ClampedArray(width * height * 4);
    const legend = buildColorRamp(options.frameResult.frameType);
    const gridIndexByCell = new Map();
    for (let gridIndex = 0; gridIndex < options.gridMeta.gridId.length; gridIndex += 1) {
        const row = options.gridMeta.row[gridIndex];
        const col = options.gridMeta.col[gridIndex];
        gridIndexByCell.set(toCellKey(row, col), gridIndex);
    }
    const renderField = pixelScale > 1
        ? buildBridgeRenderField({
            frameResult: options.frameResult,
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
                gridIndexByCell,
                sourceRow: row / pixelScale,
                sourceCol: col / pixelScale,
                legend,
                pixelScale
            });
            const bin = resolveLegendBin({
                legendId: options.frameResult.legendId,
                productType: options.frameResult.frameType,
                bins: legend
            }, value);
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
        renderBoundary: options.renderBoundary,
        gridResolutionM: options.gridResolutionM
    });
    return {
        frameKey: options.frameResult.frameKey,
        legendId: options.frameResult.legendId,
        width,
        height,
        pixels,
        getPixel(gridIndex) {
            const row = options.gridMeta.row[gridIndex];
            const col = options.gridMeta.col[gridIndex];
            const offset = ((row * pixelScale) * width + col * pixelScale) * 4;
            return pixels.slice(offset, offset + 4);
        },
        queryGridValue(row, col) {
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
function toCellKey(row, col) {
    return `${row}:${col}`;
}
function sampleInterpolatedValue(options) {
    const exactGridIndex = Number.isInteger(options.sourceRow) && Number.isInteger(options.sourceCol)
        ? options.gridIndexByCell.get(toCellKey(options.sourceRow, options.sourceCol))
        : undefined;
    if (exactGridIndex !== undefined) {
        if (options.pixelScale === 1) {
            if (options.rainMask[exactGridIndex] === 1) {
                return options.valueGrid[exactGridIndex];
            }
            return Number.NaN;
        }
        if (options.rainMask[exactGridIndex] !== 1 ||
            resolveBinIndex(options.legend, options.valueGrid[exactGridIndex]) < 0) {
            return Number.NaN;
        }
        return sampleGridCenterBlendedValue(options);
    }
    return sampleInterpolatedValueOffCenter(options);
}
function smoothGridCenterPixels(options) {
    for (let sourceRow = 0; sourceRow < options.sourceHeight; sourceRow += 1) {
        for (let sourceCol = 0; sourceCol < options.sourceWidth; sourceCol += 1) {
            const gridIndex = options.gridIndexByCell.get(toCellKey(sourceRow, sourceCol));
            if (gridIndex === undefined || options.rainMask[gridIndex] !== 1) {
                continue;
            }
            if (!resolveLegendBin({
                legendId: options.legendId,
                productType: options.frameType,
                bins: options.legend
            }, options.valueGrid[gridIndex])) {
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
function pickCenterReplacementOffset(options) {
    const candidates = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0]
    ];
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
function sampleGridCenterBlendedValue(options) {
    const delta = 1 / options.pixelScale;
    const sampleOffsets = [
        [-delta, -delta],
        [-delta, delta],
        [delta, -delta],
        [delta, delta]
    ];
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
function sampleInterpolatedValueOffCenter(options) {
    const baseRow = Math.floor(options.sourceRow);
    const baseCol = Math.floor(options.sourceCol);
    const nextRow = Math.ceil(options.sourceRow);
    const nextCol = Math.ceil(options.sourceCol);
    const rowWeight = options.sourceRow - baseRow;
    const colWeight = options.sourceCol - baseCol;
    const corners = [
        { row: baseRow, col: baseCol, weight: (1 - rowWeight) * (1 - colWeight) },
        { row: baseRow, col: nextCol, weight: (1 - rowWeight) * colWeight },
        { row: nextRow, col: baseCol, weight: rowWeight * (1 - colWeight) },
        { row: nextRow, col: nextCol, weight: rowWeight * colWeight }
    ];
    let maxValue = Number.NEGATIVE_INFINITY;
    let weightedValue = 0;
    const cornerBinIndices = [];
    const cornerPeakWeighted = {
        weightedSum: 0,
        totalWeight: 0
    };
    for (const corner of corners) {
        if (corner.weight <= 0) {
            continue;
        }
        const gridIndex = options.gridIndexByCell.get(toCellKey(corner.row, corner.col));
        if (gridIndex === undefined || options.rainMask[gridIndex] !== 1) {
            continue;
        }
        const value = options.valueGrid[gridIndex];
        const binIndex = resolveBinIndex(options.legend, value);
        cornerBinIndices.push(binIndex);
        if (value > maxValue) {
            maxValue = value;
        }
        weightedValue += value * corner.weight;
        if (binIndex > -1) {
            cornerPeakWeighted.weightedSum += value * corner.weight;
            cornerPeakWeighted.totalWeight += corner.weight;
        }
    }
    if (!Number.isFinite(maxValue)) {
        return sampleLowBinFeatheredValue({
            valueGrid: options.valueGrid,
            rainMask: options.rainMask,
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
        gridIndexByCell: options.gridIndexByCell,
        sourceRow: options.sourceRow,
        sourceCol: options.sourceCol,
        legend: options.legend,
        fallbackValue: weightedValue
    });
}
function getMaxValue(values) {
    let max = -1;
    for (let index = 0; index < values.length; index += 1) {
        if (values[index] > max) {
            max = values[index];
        }
    }
    return max;
}
function drawBoundaryOverlay(options) {
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
function inferGridTransform(gridMeta, fallbackResolutionM) {
    const colStep = inferAxisStep(gridMeta.centerX, gridMeta.col, gridMeta.row, fallbackResolutionM, "row");
    const rowStep = inferAxisStep(gridMeta.centerY, gridMeta.row, gridMeta.col, fallbackResolutionM ? -fallbackResolutionM : undefined, "col");
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
function inferAxisStep(values, primaryAxis, secondaryAxis, fallback, secondaryName) {
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
function collectBoundaryRings(renderBoundary) {
    const rings = [];
    const features = Array.isArray(renderBoundary.features)
        ? renderBoundary.features
        : [];
    for (const feature of features) {
        const geometry = feature.geometry;
        if (!geometry) {
            continue;
        }
        if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
            for (const ring of geometry.coordinates) {
                if (Array.isArray(ring)) {
                    rings.push(ring);
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
                        rings.push(ring);
                    }
                }
            }
        }
    }
    return rings;
}
function projectLonLatToPixel(point, transform, pixelScale) {
    const projected = lonLatToWebMercator(point[0], point[1]);
    const sourceCol = (projected.x - transform.originX) / transform.colStep - 0.5;
    const sourceRow = (projected.y - transform.originY) / transform.rowStep - 0.5;
    return {
        x: Math.round(sourceCol * pixelScale),
        y: Math.round(sourceRow * pixelScale)
    };
}
function lonLatToWebMercator(lon, lat) {
    const earthRadius = 6378137;
    const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
    const radians = Math.PI / 180;
    return {
        x: earthRadius * lon * radians,
        y: earthRadius * Math.log(Math.tan(Math.PI / 4 + (clampedLat * radians) / 2))
    };
}
function drawLine(pixels, width, height, start, end) {
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
function paintPixel(pixels, width, height, x, y) {
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
function buildBridgeRenderField(options) {
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
        if (binIndex ===
            findLocalMaxBinIndex({
                row,
                col,
                radius: BRIDGE_MAX_SPAN,
                binIndexByGrid,
                gridIndexByCell: options.gridIndexByCell
            })) {
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
            for (let colOffset = -BRIDGE_MAX_SPAN; colOffset <= BRIDGE_MAX_SPAN; colOffset += 1) {
                if ((rowOffset === 0 && colOffset === 0) ||
                    Math.max(Math.abs(rowOffset), Math.abs(colOffset)) < 2) {
                    continue;
                }
                const targetGridIndex = options.gridIndexByCell.get(toCellKey(row + rowOffset, col + colOffset));
                if (targetGridIndex === undefined ||
                    targetGridIndex <= gridIndex ||
                    localPeakMask[targetGridIndex] !== 1 ||
                    binIndexByGrid[targetGridIndex] !== binIndex) {
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
    return {
        valueGrid,
        rainMask
    };
}
function resolveBinIndex(legend, value) {
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
function findRelativePeakBin(binIndices) {
    const uniqueBinIndices = Array.from(new Set(binIndices.filter((binIndex) => binIndex >= 0))).sort((left, right) => right - left);
    if (uniqueBinIndices.length < 2) {
        return -1;
    }
    return uniqueBinIndices[0] > uniqueBinIndices[1] ? uniqueBinIndices[0] : -1;
}
function shouldPreserveAbsolutePeakBin(binIndex, legendLength) {
    return binIndex >= Math.floor(legendLength / 2);
}
function sampleCornerPeakValue(options) {
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
function hasStrongerNeighborSupport(options) {
    for (let rowOffset = -STRONGER_SUPPORT_RADIUS; rowOffset <= STRONGER_SUPPORT_RADIUS; rowOffset += 1) {
        for (let colOffset = -STRONGER_SUPPORT_RADIUS; colOffset <= STRONGER_SUPPORT_RADIUS; colOffset += 1) {
            if (rowOffset === 0 && colOffset === 0) {
                continue;
            }
            const neighborGridIndex = options.gridIndexByCell.get(toCellKey(options.row + rowOffset, options.col + colOffset));
            if (neighborGridIndex === undefined ||
                options.rainMask[neighborGridIndex] !== 1) {
                continue;
            }
            const neighborBinIndex = resolveBinIndex(options.legend, options.valueGrid[neighborGridIndex]);
            if (neighborBinIndex > options.currentBinIndex) {
                return true;
            }
        }
    }
    return false;
}
function hasComparableNeighborSupport(options) {
    for (let rowOffset = -STRONGER_SUPPORT_RADIUS; rowOffset <= STRONGER_SUPPORT_RADIUS; rowOffset += 1) {
        for (let colOffset = -STRONGER_SUPPORT_RADIUS; colOffset <= STRONGER_SUPPORT_RADIUS; colOffset += 1) {
            if (rowOffset === 0 && colOffset === 0) {
                continue;
            }
            const neighborGridIndex = options.gridIndexByCell.get(toCellKey(options.row + rowOffset, options.col + colOffset));
            if (neighborGridIndex === undefined ||
                options.rainMask[neighborGridIndex] !== 1) {
                continue;
            }
            const neighborBinIndex = resolveBinIndex(options.legend, options.valueGrid[neighborGridIndex]);
            if (neighborBinIndex >= options.currentBinIndex) {
                return true;
            }
        }
    }
    return false;
}
function suppressIsolatedLowPatches(options) {
    const visited = new Uint8Array(options.rainMask.length);
    for (let gridIndex = 0; gridIndex < options.rainMask.length; gridIndex += 1) {
        const binIndex = options.binIndexByGrid[gridIndex];
        if (visited[gridIndex] === 1 ||
            options.rainMask[gridIndex] !== 1 ||
            binIndex < 0 ||
            binIndex > ISOLATED_LOW_BIN_MAX_INDEX) {
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
        if (patch.some((currentGridIndex) => options.hardAnchorMask[currentGridIndex] === 1) ||
            hasNearbyBinSupport({
                patch,
                patchBinIndex: binIndex,
                rainMask: options.rainMask,
                binIndexByGrid: options.binIndexByGrid,
                gridMeta: options.gridMeta,
                gridIndexByCell: options.gridIndexByCell
            })) {
            continue;
        }
        for (const currentGridIndex of patch) {
            options.rainMask[currentGridIndex] = 0;
            options.binIndexByGrid[currentGridIndex] = -1;
        }
    }
}
function collectSameBinPatch(options) {
    const patch = [];
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
                const neighborGridIndex = options.gridIndexByCell.get(toCellKey(row + rowOffset, col + colOffset));
                if (neighborGridIndex === undefined ||
                    options.visited[neighborGridIndex] === 1 ||
                    options.rainMask[neighborGridIndex] !== 1 ||
                    options.binIndexByGrid[neighborGridIndex] !== options.targetBinIndex) {
                    continue;
                }
                options.visited[neighborGridIndex] = 1;
                queue.push(neighborGridIndex);
            }
        }
    }
    return patch;
}
function hasNearbyBinSupport(options) {
    const patchSet = new Set(options.patch);
    for (const currentGridIndex of options.patch) {
        const row = options.gridMeta.row[currentGridIndex];
        const col = options.gridMeta.col[currentGridIndex];
        for (let rowOffset = -ISOLATED_SUPPORT_RADIUS; rowOffset <= ISOLATED_SUPPORT_RADIUS; rowOffset += 1) {
            for (let colOffset = -ISOLATED_SUPPORT_RADIUS; colOffset <= ISOLATED_SUPPORT_RADIUS; colOffset += 1) {
                if (rowOffset === 0 && colOffset === 0) {
                    continue;
                }
                const neighborGridIndex = options.gridIndexByCell.get(toCellKey(row + rowOffset, col + colOffset));
                if (neighborGridIndex === undefined ||
                    patchSet.has(neighborGridIndex) ||
                    options.rainMask[neighborGridIndex] !== 1) {
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
function sampleLowBinFeatheredValue(options) {
    const radius = options.radius ?? LOW_BIN_FEATHER_RADIUS;
    const featherDistance = radius + 0.5;
    const preservePeakBins = options.preservePeakBins ?? true;
    const centerRow = Math.round(options.sourceRow);
    const centerCol = Math.round(options.sourceCol);
    let weightedSum = 0;
    let totalWeight = 0;
    let rainyWeight = 0;
    const weightedSumByBin = new Map();
    const weightByBin = new Map();
    const binIndices = [];
    for (let rowOffset = -radius; rowOffset <= radius; rowOffset += 1) {
        for (let colOffset = -radius; colOffset <= radius; colOffset += 1) {
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
            if (options.rainMask[gridIndex] !== 1) {
                continue;
            }
            const value = options.valueGrid[gridIndex];
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
        const maxBinIndex = binIndices.reduce((currentMax, binIndex) => (binIndex > currentMax ? binIndex : currentMax), -1);
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
function findLocalMaxBinIndex(options) {
    let maxBinIndex = -1;
    for (let rowOffset = -options.radius; rowOffset <= options.radius; rowOffset += 1) {
        for (let colOffset = -options.radius; colOffset <= options.radius; colOffset += 1) {
            const gridIndex = options.gridIndexByCell.get(toCellKey(options.row + rowOffset, options.col + colOffset));
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
function collectBridgePath(options) {
    const path = [];
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
