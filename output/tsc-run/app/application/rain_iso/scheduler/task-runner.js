import { validateLoadedRainIsoPackage } from "../../../infrastructure/rain_iso/package/package-validator.js";
import { createMetricsCollector } from "../../../shared/metrics.js";
import { runFrameOnCpu } from "../use-cases/run-frame-on-cpu.js";
import { buildScheduledFrames } from "./frame-scheduler.js";
export const TaskRunnerPhase = {
    Assembling: "assembling"
};
export async function runTaskFrames(options) {
    validateLoadedRainIsoPackage({
        stationIds: options.rain5mSequence.stationIds,
        rain5m: options.rain5mSequence,
        accum1h: options.accum1hSequence
    });
    const now = options.now ?? (() => Date.now());
    const yieldControl = options.yieldControl ?? (async () => { });
    const scheduledFrames = buildScheduledFrames({
        rain5mSequence: options.rain5mSequence,
        accum1hSequence: options.accum1hSequence
    });
    const totalFrames = scheduledFrames.length;
    const taskStartedAt = now();
    const metrics = createMetricsCollector();
    let completedFrames = 0;
    options.onTaskStarted?.({
        taskId: options.taskId,
        selectedBackend: options.selectedBackend,
        totalFrames
    });
    for (const frame of scheduledFrames) {
        if (options.isCancelled?.()) {
            return {
                taskId: options.taskId,
                status: "cancelled",
                completedFrames,
                totalFrames,
                elapsedMs: now() - taskStartedAt,
                metrics: metrics.buildSummary(now() - taskStartedAt)
            };
        }
        await yieldControl();
        if (options.isCancelled?.()) {
            return {
                taskId: options.taskId,
                status: "cancelled",
                completedFrames,
                totalFrames,
                elapsedMs: now() - taskStartedAt,
                metrics: metrics.buildSummary(now() - taskStartedAt)
            };
        }
        const frameStartedAt = now();
        const frameResult = runFrameOnCpu(frame, {
            assets: options.assets,
            selectedBackend: options.selectedBackend,
            rainMaskRadiusConfig: options.rainMaskRadiusConfig
        });
        frameResult.summary.elapsedMs = now() - frameStartedAt;
        metrics.recordFrame(frameResult.summary.elapsedMs);
        completedFrames += 1;
        options.onFrameReady?.({
            taskId: options.taskId,
            frameKey: frame.frameKey,
            frameResult
        });
        options.onTaskProgress?.({
            taskId: options.taskId,
            completedFrames,
            totalFrames,
            currentFrameKey: frame.frameKey,
            phase: TaskRunnerPhase.Assembling
        });
    }
    return {
        taskId: options.taskId,
        status: "completed",
        completedFrames,
        totalFrames,
        elapsedMs: now() - taskStartedAt,
        metrics: metrics.buildSummary(now() - taskStartedAt)
    };
}
