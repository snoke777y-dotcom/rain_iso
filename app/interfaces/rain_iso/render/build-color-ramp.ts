import { getLegendByFrameType } from "../../../domain/rain_iso/legend.js";
import type { FrameType } from "../../../domain/rain_iso/models.js";

export type ColorRampEntry = ReturnType<typeof buildColorRamp>[number];

export function buildColorRamp(frameType: FrameType) {
  return getLegendByFrameType(frameType).bins.map((bin) => ({
    ...bin,
    rgba: hexToRgba(bin.color)
  }));
}

function hexToRgba(color: string): [number, number, number, number] {
  const normalized = color.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return [red, green, blue, 255];
}
