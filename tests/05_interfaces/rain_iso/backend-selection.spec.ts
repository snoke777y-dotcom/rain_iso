import { describe, expect, it } from "vitest";

import {
  BackendKind,
  createRainIsoBootstrap,
  createRainIsoWorkerEntry,
  type RainIsoWorkerRequest,
  type RainIsoWorkerResponse,
  type WorkerAssetPayload
} from "../../../app/interfaces/rain_iso/index.js";
import {
  RAIN_ISO_ALGORITHM_PROFILE_VERSION,
  RAIN_ISO_PROTOCOL_VERSION
} from "../../../app/domain/rain_iso/constants.js";
import { FrameType } from "../../../app/domain/rain_iso/models.js";
import type { RainIsoDirectSequence } from "../../../app/infrastructure/rain_iso/package/raw-api-adapter.js";

class LoopbackWorker {
  public onmessage: ((event: MessageEvent<RainIsoWorkerResponse>) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private readonly entry;

  constructor(selectedBackend: "webgpu" | "webgl2" | "cpu") {
    this.entry = createRainIsoWorkerEntry({
      detectBackend: async ({ preferredBackend }) => {
        if (preferredBackend === "webgl2") {
          return {
            selectedBackend: "webgl2",
            availableBackends: ["webgpu", "webgl2", "cpu"]
          };
        }

        return {
          selectedBackend,
          availableBackends: ["webgpu", "webgl2", "cpu"]
        };
      },
      postResponse: (response) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: response
          } as MessageEvent<RainIsoWorkerResponse>);
        });
      }
    });
  }

  postMessage(message: RainIsoWorkerRequest): void {
    void this.entry.handleMessage(message);
  }

  terminate(): void {}
}

describe("backend selection in worker flow", () => {
  it("自动模式会把探测到的 GPU 结果固定到整次任务", async () => {
    const bootstrap = createRainIsoBootstrap({
      workerFactory: () => new LoopbackWorker("webgpu")
    });

    await bootstrap.client.loadAssets(createWorkerAssetsPayload());
    const detected = await bootstrap.client.detectBackend();
    expect(detected.selectedBackend).toBe("webgpu");

    const selectedBackends: string[] = [];
    await bootstrap.client.startTask(
      {
        taskId: "task-backend-auto",
        preferredBackend: BackendKind.Auto,
        rain5mSequence: createSequence({
          productType: FrameType.Rain5m,
          frameTimes: ["2026-06-24T13:55:00+08:00"],
          values: [5.2, 2.4]
        }),
        accum1hSequence: createSequence({
          productType: FrameType.Accum1hStep,
          frameTimes: [],
          values: []
        })
      },
      {
        onTaskStarted(event) {
          selectedBackends.push(event.selectedBackend);
        },
        onFrameReady(event) {
          selectedBackends.push(event.frameResult.selectedBackend);
        }
      }
    );

    expect(selectedBackends).toEqual(["webgpu", "webgpu"]);
  });

  it("任务启动前显式指定 WebGL2 时不会被中途切回 WebGPU", async () => {
    const globalLike = globalThis as typeof globalThis & {
      OffscreenCanvas?: new (width: number, height: number) => {
        getContext: (kind: string) => unknown;
      };
    };
    const previousCanvas = globalLike.OffscreenCanvas;
    const gl = {
      VERTEX_SHADER: 0x8b31,
      FRAGMENT_SHADER: 0x8b30,
      COMPILE_STATUS: 0x8b81,
      LINK_STATUS: 0x8b82,
      TRIANGLES: 0x0004,
      RGBA: 0x1908,
      FLOAT: 0x1406,
      TEXTURE_2D: 0x0de1,
      COLOR_ATTACHMENT0: 0x8ce0,
      FRAMEBUFFER: 0x8d40,
      TEXTURE0: 0x84c0,
      createShader() {
        return {};
      },
      shaderSource() {},
      compileShader() {},
      getShaderParameter() {
        return true;
      },
      getShaderInfoLog() {
        return "";
      },
      createProgram() {
        return {};
      },
      attachShader() {},
      linkProgram() {},
      getProgramParameter() {
        return true;
      },
      getProgramInfoLog() {
        return "";
      },
      useProgram() {},
      createTexture() {
        return {};
      },
      bindTexture() {},
      texParameteri() {},
      texImage2D() {},
      createFramebuffer() {
        return {};
      },
      bindFramebuffer() {},
      framebufferTexture2D() {},
      viewport() {},
      activeTexture() {},
      clear() {},
      getExtension() {
        return {};
      },
      getUniformLocation() {
        return {};
      },
      uniform1i() {},
      uniform1f() {},
      createVertexArray() {
        return {};
      },
      bindVertexArray() {},
      drawArrays() {},
      readPixels() {}
    };
    globalLike.OffscreenCanvas = class {
      width = 0;
      height = 0;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }

      getContext(kind: string) {
        return kind === "webgl2" ? gl : null;
      }
    };

    try {
      const bootstrap = createRainIsoBootstrap({
        workerFactory: () => new LoopbackWorker("webgpu")
      });

      await bootstrap.client.loadAssets(createWorkerAssetsPayload());

      const selectedBackends: string[] = [];
      await bootstrap.client.startTask(
        {
          taskId: "task-backend-webgl2",
          preferredBackend: BackendKind.WebGl2,
          rain5mSequence: createSequence({
            productType: FrameType.Rain5m,
            frameTimes: ["2026-06-24T13:55:00+08:00"],
            values: [1.2, 0.8]
          }),
          accum1hSequence: createSequence({
            productType: FrameType.Accum1hStep,
            frameTimes: [],
            values: []
          })
        },
        {
          onTaskStarted(event) {
            selectedBackends.push(event.selectedBackend);
          },
          onFrameReady(event) {
            selectedBackends.push(event.frameResult.selectedBackend);
          }
        }
      );

      expect(selectedBackends).toEqual(["webgl2", "webgl2"]);
    } finally {
      globalLike.OffscreenCanvas = previousCanvas;
    }
  });

  it("WebGL2 首帧降级后同一任务后续帧继续按 CPU 执行", async () => {
    const globalLike = globalThis as typeof globalThis & {
      OffscreenCanvas?: new (width: number, height: number) => {
        getContext: (kind: string) => unknown;
      };
    };
    const previousCanvas = globalLike.OffscreenCanvas;
    let remainingReadPixelsFailures = 1;
    const gl = {
      VERTEX_SHADER: 0x8b31,
      FRAGMENT_SHADER: 0x8b30,
      COMPILE_STATUS: 0x8b81,
      LINK_STATUS: 0x8b82,
      TRIANGLES: 0x0004,
      RGBA: 0x1908,
      FLOAT: 0x1406,
      TEXTURE_2D: 0x0de1,
      COLOR_ATTACHMENT0: 0x8ce0,
      FRAMEBUFFER: 0x8d40,
      TEXTURE0: 0x84c0,
      createShader() {
        return {};
      },
      shaderSource() {},
      compileShader() {},
      getShaderParameter() {
        return true;
      },
      getShaderInfoLog() {
        return "";
      },
      createProgram() {
        return {};
      },
      attachShader() {},
      linkProgram() {},
      getProgramParameter() {
        return true;
      },
      getProgramInfoLog() {
        return "";
      },
      useProgram() {},
      createTexture() {
        return {};
      },
      bindTexture() {},
      texParameteri() {},
      texImage2D() {},
      createFramebuffer() {
        return {};
      },
      bindFramebuffer() {},
      framebufferTexture2D() {},
      viewport() {},
      activeTexture() {},
      clear() {},
      getExtension() {
        return {};
      },
      getUniformLocation() {
        return {};
      },
      uniform1i() {},
      uniform1f() {},
      createBuffer() {
        return {};
      },
      createVertexArray() {
        return {};
      },
      bindVertexArray() {},
      bindBuffer() {},
      bufferData() {},
      enableVertexAttribArray() {},
      vertexAttribPointer() {},
      drawArrays() {},
      readPixels() {
        if (remainingReadPixelsFailures > 0) {
          remainingReadPixelsFailures -= 1;
          throw new Error("mock readPixels failure");
        }
      }
    };
    globalLike.OffscreenCanvas = class {
      width = 0;
      height = 0;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
      }

      getContext(kind: string) {
        return kind === "webgl2" ? gl : null;
      }
    };

    try {
      const bootstrap = createRainIsoBootstrap({
        workerFactory: () => new LoopbackWorker("webgpu")
      });

      await bootstrap.client.loadAssets(createWorkerAssetsPayload());

      const selectedBackends: string[] = [];
      await bootstrap.client.startTask(
        {
          taskId: "task-backend-webgl2-fallback",
          preferredBackend: BackendKind.WebGl2,
          rain5mSequence: createSequence({
            productType: FrameType.Rain5m,
            frameTimes: [
              "2026-06-24T13:50:00+08:00",
              "2026-06-24T13:55:00+08:00"
            ],
            values: [
              1.2,
              0.8,
              2.4,
              1.2
            ]
          }),
          accum1hSequence: createSequence({
            productType: FrameType.Accum1hStep,
            frameTimes: [],
            values: []
          })
        },
        {
          onTaskStarted(event) {
            selectedBackends.push(event.selectedBackend);
          },
          onFrameReady(event) {
            selectedBackends.push(event.frameResult.selectedBackend);
          }
        }
      );

      expect(selectedBackends).toEqual(["webgl2", "cpu", "cpu"]);
    } finally {
      globalLike.OffscreenCanvas = previousCanvas;
    }
  });
});

function createWorkerAssetsPayload(): WorkerAssetPayload {
  return {
    asset_manifest: {
      protocol_version: RAIN_ISO_PROTOCOL_VERSION,
      asset_version: "2026-06-bj-grid-v1",
      algorithm_profile_version: RAIN_ISO_ALGORITHM_PROFILE_VERSION,
      grid_resolution_m: 1000,
      grid_rows: 1,
      grid_cols: 3,
      grid_count: 3,
      grid_crs: "EPSG:3857",
      render_crs: "EPSG:4326",
      files: {
        grid_meta: "grid_meta.bin",
        grid_mask: "grid_mask.bin",
        grid_neighbors: "grid_neighbors.bin",
        station_to_grid: "station_to_grid.bin",
        station_meta: "station_meta.json",
        render_boundary: "render_boundary.geojson"
      },
      checksums: {
        grid_meta: "sha256:test",
        grid_mask: "sha256:test",
        grid_neighbors: "sha256:test",
        station_to_grid: "sha256:test",
        station_meta: "sha256:test",
        render_boundary: "sha256:test"
      }
    },
    grid_meta: {
      grid_id: new Int32Array([0, 1, 2]),
      row: new Int32Array([0, 0, 0]),
      col: new Int32Array([0, 1, 2]),
      center_x: new Float32Array([0, 1000, 2000]),
      center_y: new Float32Array([0, 0, 0])
    },
    grid_mask: new Uint8Array([1, 1, 1]),
    grid_neighbors: createLineNeighbors(3),
    station_to_grid: new Int32Array([0, 2]),
    station_meta: {
      station_count: 2,
      stations: [
        {
          station_id: "FIX-1",
          station_name: "Fix",
          lon: 116,
          lat: 40,
          is_fortress_anchor: true,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        },
        {
          station_id: "ORD-1",
          station_name: "Ord",
          lon: 116.01,
          lat: 40,
          is_fortress_anchor: false,
          is_tongzhou_anchor: false,
          is_cross_boundary_anchor: false
        }
      ]
    }
  };
}

function createSequence(input: {
  productType: FrameType;
  frameTimes: string[];
  values: number[];
}): RainIsoDirectSequence {
  return {
    frameTimes: input.frameTimes,
    productType: input.productType,
    stationIds: ["FIX-1", "ORD-1"],
    stationMetaById: {
      "FIX-1": createRawRecord("FIX-1", "Fix"),
      "ORD-1": createRawRecord("ORD-1", "Ord")
    },
    values: new Float32Array(input.values)
  };
}

function createRawRecord(stcd: string, stationName: string) {
  return {
    sysid: "1",
    stcd,
    stnm: stationName,
    rvnm: "",
    hnnm: "",
    lgtd: 116,
    lttd: 40,
    stlc: "",
    addvcd: "110000",
    addvnm: "北京",
    adnm: "",
    stlvl: "1",
    admauth: "",
    isOut: "",
    drp: 0,
    bscd: "",
    bsnm: "",
    area: "110000",
    star: 0
  };
}

function createLineNeighbors(gridCount: number): Int32Array {
  const neighbors = new Int32Array(gridCount * 8).fill(-1);
  for (let index = 0; index < gridCount; index += 1) {
    if (index > 0) {
      neighbors[index * 8] = index - 1;
    }
    if (index < gridCount - 1) {
      neighbors[index * 8 + 1] = index + 1;
    }
  }
  return neighbors;
}
