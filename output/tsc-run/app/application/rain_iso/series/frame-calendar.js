export function buildFrameCalendar(frameTimes) {
    return frameTimes
        .map((frameTime, sourceIndex) => ({
        frameTime,
        sourceIndex
    }))
        .sort((left, right) => left.frameTime.localeCompare(right.frameTime));
}
