import { buildFrameCalendar } from "./frame-calendar.js";
export function buildDirectFrames(sequence) {
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
