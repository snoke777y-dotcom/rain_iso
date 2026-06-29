import { FrameType } from "../../../domain/rain_iso/models.js";
import { buildDirectFrames } from "../series/build-5m-frames.js";
export function buildScheduledFrames(input) {
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
function compareFrameType(left, right) {
    return getFrameTypeOrder(left) - getFrameTypeOrder(right);
}
function getFrameTypeOrder(frameType) {
    return frameType === FrameType.Rain5m ? 0 : 1;
}
