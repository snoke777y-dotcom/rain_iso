import { buildFrameCalendar } from "./frame-calendar.js";
import type { FrameType } from "../../../domain/rain_iso/models.js";

export type DirectSequenceInput = {
  productType: FrameType;
  stationIds: string[];
  frameTimes: string[];
  values: Float32Array;
};

export type DirectFrame = {
  frameKey: string;
  frameType: FrameType;
  frameTime: string;
  stationIds: string[];
  stationValues: Float32Array;
};

export function buildDirectFrames(sequence: DirectSequenceInput): DirectFrame[] {
  const calendar = buildFrameCalendar(sequence.frameTimes);
  const stationCount = sequence.stationIds.length;

  return calendar.map(({ frameTime, sourceIndex }) => {
    const start = sourceIndex * stationCount;
    const end = start + stationCount;

    return {
      frameKey: `${sequence.productType}|${frameTime}`,
      frameType: sequence.productType,
      frameTime,
      stationIds: sequence.stationIds,
      stationValues: sequence.values.slice(start, end)
    };
  });
}
