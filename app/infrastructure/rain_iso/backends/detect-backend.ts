import { BackendKind, type BackendKind as BackendKindType } from "../../../domain/rain_iso/models.js";
import type {
  AvailableBackend,
  BackendDetectionResult,
  BackendProbeResult,
  DetectBackendOptions
} from "./backend-types.js";
import { ensureWebGpuContext } from "../gpu/webgpu/context.js";

export async function detectBackend(
  options: DetectBackendOptions = {}
): Promise<BackendDetectionResult> {
  const probeWebGpu = options.probeWebGpu ?? probeWebGpuFromRuntime;
  const probeWebGl2 = options.probeWebGl2 ?? probeWebGl2FromRuntime;
  const availableBackends: AvailableBackend[] = [];

  if (normalizeProbeResult(await probeWebGpu()).available) {
    availableBackends.push(BackendKind.WebGpu);
  }

  if (normalizeProbeResult(probeWebGl2()).available) {
    availableBackends.push(BackendKind.WebGl2);
  }

  availableBackends.push(BackendKind.Cpu);

  return {
    selectedBackend: resolveSelectedBackend(
      options.preferredBackend ?? BackendKind.Auto,
      availableBackends
    ),
    availableBackends
  };
}

function resolveSelectedBackend(
  preferredBackend: BackendKindType,
  availableBackends: AvailableBackend[]
): AvailableBackend {
  if (preferredBackend === BackendKind.Auto) {
    return availableBackends[0];
  }

  if (availableBackends.includes(preferredBackend as AvailableBackend)) {
    return preferredBackend as AvailableBackend;
  }

  throw createBackendUnavailableError(
    `请求后端 ${preferredBackend} 不可用`
  );
}

function createBackendUnavailableError(message: string) {
  const error = new Error(message) as Error & {
    code: "BACKEND_UNAVAILABLE";
  };
  error.code = "BACKEND_UNAVAILABLE";
  return error;
}

function normalizeProbeResult(result: BackendProbeResult | boolean): BackendProbeResult {
  return typeof result === "boolean" ? { available: result } : result;
}

async function probeWebGpuFromRuntime(): Promise<BackendProbeResult> {
  const adapter = await ensureWebGpuContext();
  return {
    available: adapter !== null,
    adapterName: adapter?.adapterName
  };
}

function probeWebGl2FromRuntime(): BackendProbeResult {
  const globalLike = globalThis as typeof globalThis & {
    OffscreenCanvas?: new (width: number, height: number) => {
      getContext: (kind: string) => unknown;
    };
    document?: {
      createElement?: (tagName: string) => {
        getContext?: (kind: string) => unknown;
      };
    };
  };

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
