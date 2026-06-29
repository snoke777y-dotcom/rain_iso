import { FrameType } from "../../../domain/rain_iso/models.js";
import { buildDirectFrames, type DirectFrame } from "../series/build-5m-frames.js";
import type { RainIsoDirectSequence } from "../../../infrastructure/rain_iso/package/raw-api-adapter.js";

export function buildScheduledFrames(input: {
  rain5mSequence: RainIsoDirectSequence;
  accum1hSequence: RainIsoDirectSequence;
}): DirectFrame[] {
  return [
    ...buildDirectFrames(input.rain5mSequence),
    ...buildDirectFrames(input.accum1hSequence)
  ].sort((left, right) => {
    const timeOrder = left.frameTime.localeCompare(right.frameTime);
    if (timeOrder !== 0) {
      return timeOrder;
    }

    return compareFrameType(left.frameType, right.frameType);
  });
}

function compareFrameType(left: FrameType, right: FrameType): number {
  return getFrameTypeOrder(left) - getFrameTypeOrder(right);
}

function getFrameTypeOrder(frameType: FrameType): number {
  return frameType === FrameType.Rain5m ? 0 : 1;
}
