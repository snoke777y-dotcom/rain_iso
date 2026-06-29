import { getLegendByFrameType } from "../../../domain/rain_iso/legend.js";
export function buildColorRamp(frameType) {
    return getLegendByFrameType(frameType).bins.map((bin) => ({
        ...bin,
        rgba: hexToRgba(bin.color)
    }));
}
function hexToRgba(color) {
    const normalized = color.replace("#", "");
    const red = Number.parseInt(normalized.slice(0, 2), 16);
    const green = Number.parseInt(normalized.slice(2, 4), 16);
    const blue = Number.parseInt(normalized.slice(4, 6), 16);
    return [red, green, blue, 255];
}
