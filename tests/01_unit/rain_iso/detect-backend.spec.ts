import { describe, expect, it } from "vitest";

import { BackendKind } from "../../../app/domain/rain_iso/models.js";
import { detectBackend } from "../../../app/infrastructure/rain_iso/backends/detect-backend.js";

describe("detectBackend", () => {
  it("按 WebGPU -> WebGL2 -> CPU 顺序选择可用后端", async () => {
    const result = await detectBackend({
      preferredBackend: BackendKind.Auto,
      probeWebGpu: async () => ({
        available: true,
        adapterName: "mock-webgpu"
      }),
      probeWebGl2: () => ({
        available: true,
        renderer: "mock-webgl2"
      })
    });

    expect(result.selectedBackend).toBe("webgpu");
    expect(result.availableBackends).toEqual(["webgpu", "webgl2", "cpu"]);
  });

  it("GPU 不可用时直接回退到 CPU", async () => {
    const result = await detectBackend({
      preferredBackend: BackendKind.Auto,
      probeWebGpu: async () => ({
        available: false
      }),
      probeWebGl2: () => ({
        available: false
      })
    });

    expect(result.selectedBackend).toBe("cpu");
    expect(result.availableBackends).toEqual(["cpu"]);
  });

  it("显式指定不可用后端时返回统一不可用错误", async () => {
    await expect(
      detectBackend({
        preferredBackend: BackendKind.WebGpu,
        probeWebGpu: async () => ({
          available: false
        }),
        probeWebGl2: () => ({
          available: true
        })
      })
    ).rejects.toMatchObject({
      code: "BACKEND_UNAVAILABLE"
    });
  });
});
