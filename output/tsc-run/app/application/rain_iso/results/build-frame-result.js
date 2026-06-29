import { getLegendByFrameType } from "../../../domain/rain_iso/legend.js";
export function buildFrameResult(options) {
    const legend = getLegendByFrameType(options.frameType);
    const renderableValues = [];
    for (let gridId = 0; gridId < options.valueGrid.length; gridId += 1) {
        if (options.rainMask[gridId] === 1 && Number.isFinite(options.valueGrid[gridId])) {
            renderableValues.push(options.valueGrid[gridId]);
        }
    }
    const maxValue = renderableValues.length > 0 ? Math.max(...renderableValues) : 0;
    const minRenderableValue = renderableValues.length > 0 ? Math.min(...renderableValues) : undefined;
    const meanRenderableValue = renderableValues.length > 0
        ? renderableValues.reduce((sum, value) => sum + value, 0) / renderableValues.length
        : undefined;
    return {
        frameKey: options.frameKey,
        frameType: options.frameType,
        frameTime: options.frameTime,
        selectedBackend: options.selectedBackend,
        legendId: legend.legendId,
        valueGrid: options.valueGrid,
        rainMask: options.rainMask,
        hardAnchorMask: options.hardAnchorMask,
        softObsMask: options.softObsMask,
        knownMask: options.knownMask,
        summary: {
            maxValue,
            renderableGridCount: renderableValues.length,
            hardAnchorCount: countMarked(options.hardAnchorMask),
            softObsCount: countMarked(options.softObsMask),
            suspectStationCount: options.suspectStationCount,
            ordinaryOnlyMode: options.ordinaryOnlyMode,
            minRenderableValue,
            meanRenderableValue
        }
    };
}
function countMarked(mask) {
    let count = 0;
    for (let index = 0; index < mask.length; index += 1) {
        if (mask[index] === 1) {
            count += 1;
        }
    }
    return count;
}
