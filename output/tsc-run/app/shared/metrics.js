export function createMetricsCollector() {
    const frameDurations = [];
    return {
        recordFrame(elapsedMs) {
            frameDurations.push(elapsedMs);
        },
        buildSummary(totalTaskMs) {
            const totalFrameMs = frameDurations.reduce((sum, value) => sum + value, 0);
            const frameCount = frameDurations.length;
            return {
                firstFrameMs: frameDurations[0],
                averageFrameMs: frameCount > 0 ? totalFrameMs / frameCount : 0,
                maxFrameMs: frameCount > 0 ? Math.max(...frameDurations) : 0,
                totalFrameMs,
                totalTaskMs,
                frameCount
            };
        }
    };
}
