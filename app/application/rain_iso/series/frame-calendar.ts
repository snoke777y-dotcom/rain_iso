export type FrameCalendarEntry = {
  frameTime: string;
  sourceIndex: number;
};

export function buildFrameCalendar(frameTimes: string[]): FrameCalendarEntry[] {
  return frameTimes
    .map((frameTime, sourceIndex) => ({
      frameTime,
      sourceIndex
    }))
    .sort((left, right) => left.frameTime.localeCompare(right.frameTime));
}
