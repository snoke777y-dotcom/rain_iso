export const RainIsoTaskStatus = {
    Idle: "idle",
    Busy: "busy",
    Terminated: "terminated"
};
export const RainIsoErrorCode = {
    AssetValidationFailed: "ASSET_VALIDATION_FAILED",
    PackageValidationFailed: "PACKAGE_VALIDATION_FAILED",
    BackendUnavailable: "BACKEND_UNAVAILABLE",
    TaskAlreadyRunning: "TASK_ALREADY_RUNNING",
    TaskNotFound: "TASK_NOT_FOUND",
    GpuContextLost: "GPU_CONTEXT_LOST",
    GpuMemoryExceeded: "GPU_MEMORY_EXCEEDED",
    FrameComputeFailed: "FRAME_COMPUTE_FAILED",
    UnknownError: "UNKNOWN_ERROR"
};
export const RainIsoTaskPhase = {
    Validating: "validating",
    Preprocessing: "preprocessing",
    SelectingAnchors: "selecting_anchors",
    SeedingGrid: "seeding_grid",
    BuildingMask: "building_mask",
    Propagating: "propagating",
    Smoothing: "smoothing",
    Assembling: "assembling"
};
export class RainIsoError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.name = "RainIsoError";
        this.code = code;
        this.details = details;
    }
}
