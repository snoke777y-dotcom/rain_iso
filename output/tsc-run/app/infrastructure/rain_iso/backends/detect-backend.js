import { BackendKind } from "../../../domain/rain_iso/models.js";
export async function detectBackend(options = {}) {
    const probeWebGpu = options.probeWebGpu ?? probeWebGpuFromRuntime;
    const probeWebGl2 = options.probeWebGl2 ?? probeWebGl2FromRuntime;
    const availableBackends = [];
    if (normalizeProbeResult(await probeWebGpu()).available) {
        availableBackends.push(BackendKind.WebGpu);
    }
    if (normalizeProbeResult(probeWebGl2()).available) {
        availableBackends.push(BackendKind.WebGl2);
    }
    availableBackends.push(BackendKind.Cpu);
    return {
        selectedBackend: resolveSelectedBackend(options.preferredBackend ?? BackendKind.Auto, availableBackends),
        availableBackends
    };
}
function resolveSelectedBackend(preferredBackend, availableBackends) {
    if (preferredBackend === BackendKind.Auto) {
        return availableBackends[0];
    }
    if (availableBackends.includes(preferredBackend)) {
        return preferredBackend;
    }
    throw createBackendUnavailableError(`请求后端 ${preferredBackend} 不可用`);
}
function createBackendUnavailableError(message) {
    const error = new Error(message);
    error.code = "BACKEND_UNAVAILABLE";
    return error;
}
function normalizeProbeResult(result) {
    return typeof result === "boolean" ? { available: result } : result;
}
async function probeWebGpuFromRuntime() {
    const navigatorLike = globalThis.navigator;
    if (!navigatorLike?.gpu?.requestAdapter) {
        return {
            available: false
        };
    }
    const adapter = await navigatorLike.gpu.requestAdapter();
    return {
        available: adapter !== null && adapter !== undefined
    };
}
function probeWebGl2FromRuntime() {
    const globalLike = globalThis;
    if (typeof globalLike.OffscreenCanvas === "function") {
        const canvas = new globalLike.OffscreenCanvas(1, 1);
        return {
            available: canvas.getContext("webgl2") !== null
        };
    }
    const canvas = globalLike.document?.createElement?.("canvas");
    return {
        available: canvas?.getContext?.("webgl2") !== null
    };
}
