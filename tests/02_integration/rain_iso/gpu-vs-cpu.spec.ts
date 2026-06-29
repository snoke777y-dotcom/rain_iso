import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { continuousPropagate } from "../../../app/infrastructure/rain_iso/cpu/continuous-propagate.js";
import { constrainedSmooth } from "../../../app/infrastructure/rain_iso/cpu/constrained-smooth.js";
import { continuousPropagateOnWebGpu } from "../../../app/infrastructure/rain_iso/gpu/webgpu/continuous-propagate.js";
import { constrainedSmoothOnWebGpu } from "../../../app/infrastructure/rain_iso/gpu/webgpu/constrained-smooth.js";
import { continuousPropagateOnWebGl2 } from "../../../app/infrastructure/rain_iso/gpu/webgl2/continuous-propagate.js";
import { constrainedSmoothOnWebGl2 } from "../../../app/infrastructure/rain_iso/gpu/webgl2/constrained-smooth.js";
import { runFrameOnCpu } from "../../../app/application/rain_iso/use-cases/run-frame-on-cpu.js";

describe("gpu backends vs cpu baseline", () => {
  it("WebGPU 和 WebGL2 的传播/平滑结果与 CPU 基线保持一致", async () => {
    const commonInput = {
      valueGrid: new Float32Array([12, 0, 4]),
      rainMask: new Uint8Array([1, 1, 1]),
      knownMask: new Uint8Array([1, 0, 1]),
      hardAnchorMask: new Uint8Array([1, 0, 0]),
      softObsMask: new Uint8Array([0, 1, 0]),
      gridNeighbors: createLineNeighbors(3),
      gridCenterX: new Float32Array([0, 1000, 2000]),
      gridCenterY: new Float32Array([0, 0, 0]),
      ordinaryOnlyMode: false
    };

    const cpuPropagated = continuousPropagate(commonInput);
    const webgpuPropagated = await continuousPropagateOnWebGpu(commonInput);
    const webgl2Propagated = await continuousPropagateOnWebGl2(commonInput);

    expect(Array.from(webgpuPropagated.valueGrid)).toEqual(
      Array.from(cpuPropagated.valueGrid)
    );
    expect(Array.from(webgl2Propagated.valueGrid)).toEqual(
      Array.from(cpuPropagated.valueGrid)
    );

    const cpuSmoothed = constrainedSmooth({
      valueGrid: cpuPropagated.valueGrid,
      rainMask: commonInput.rainMask,
      hardAnchorMask: commonInput.hardAnchorMask,
      softObsMask: commonInput.softObsMask,
      gridNeighbors: commonInput.gridNeighbors
    });
    const webgpuSmoothed = await constrainedSmoothOnWebGpu({
      valueGrid: cpuPropagated.valueGrid,
      rainMask: commonInput.rainMask,
      hardAnchorMask: commonInput.hardAnchorMask,
      softObsMask: commonInput.softObsMask,
      gridNeighbors: commonInput.gridNeighbors
    });
    const webgl2Smoothed = await constrainedSmoothOnWebGl2({
      valueGrid: cpuPropagated.valueGrid,
      rainMask: commonInput.rainMask,
      hardAnchorMask: commonInput.hardAnchorMask,
      softObsMask: commonInput.softObsMask,
      gridNeighbors: commonInput.gridNeighbors
    });

    expect(maxAbsDiff(cpuSmoothed, webgpuSmoothed)).toBeLessThanOrEqual(0.05);
    expect(maxAbsDiff(cpuSmoothed, webgl2Smoothed)).toBeLessThanOrEqual(0.05);
  });

  it("GPU 后端进入单帧链路后仍保持硬锚点格完全一致", async () => {
    const frame = {
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      frameType: FrameType.Rain5m,
      frameTime: "2026-06-24T13:55:00+08:00",
      stationIds: ["FIX-1", "ORD-1"],
      stationValues: new Float32Array([12, 4])
    };
    const assets = createAssets();

    const cpuResult = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "cpu"
    });
    const webgpuResult = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "webgpu"
    });
    const webgl2Result = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "webgl2"
    });

    expect(Array.from(webgpuResult.hardAnchorMask)).toEqual(
      Array.from(cpuResult.hardAnchorMask)
    );
    expect(Array.from(webgl2Result.hardAnchorMask)).toEqual(
      Array.from(cpuResult.hardAnchorMask)
    );
    expect(maxAbsDiff(cpuResult.valueGrid, webgpuResult.valueGrid)).toBeLessThanOrEqual(0.05);
    expect(maxAbsDiff(cpuResult.valueGrid, webgl2Result.valueGrid)).toBeLessThanOrEqual(0.05);
  });

  it("WebGPU 可用时应真正触发 compute pipeline", async () => {
    const commonInput = createCommonInput();
    const runtime = installMockWebGpuRuntime(commonInput);

    try {
      const propagated = await continuousPropagateOnWebGpu(commonInput);
      await constrainedSmoothOnWebGpu({
        valueGrid: propagated.valueGrid,
        rainMask: commonInput.rainMask,
        hardAnchorMask: commonInput.hardAnchorMask,
        softObsMask: commonInput.softObsMask,
        gridNeighbors: commonInput.gridNeighbors
      });
    } finally {
      runtime.restore();
    }

    expect(runtime.counters.requestAdapter).toBeGreaterThan(0);
    expect(runtime.counters.requestDevice).toBeGreaterThan(0);
    expect(runtime.counters.createComputePipeline).toBeGreaterThanOrEqual(2);
    expect(runtime.counters.submit).toBeGreaterThan(0);
  });

  it("WebGL2 可用时应真正触发 shader program", async () => {
    const commonInput = createCommonInput();
    const runtime = installMockWebGl2Runtime(commonInput);

    try {
      const propagated = await continuousPropagateOnWebGl2(commonInput);
      await constrainedSmoothOnWebGl2({
        valueGrid: propagated.valueGrid,
        rainMask: commonInput.rainMask,
        hardAnchorMask: commonInput.hardAnchorMask,
        softObsMask: commonInput.softObsMask,
        gridNeighbors: commonInput.gridNeighbors
      });
    } finally {
      runtime.restore();
    }

    expect(runtime.counters.createShader).toBeGreaterThan(0);
    expect(runtime.counters.linkProgram).toBeGreaterThan(0);
    expect(runtime.counters.drawArrays).toBeGreaterThan(0);
    expect(runtime.counters.readPixels).toBeGreaterThan(0);
  });

  it("WebGPU 在同一 device 上重复调用时应复用 compute pipeline", async () => {
    const commonInput = createCommonInput();
    const runtime = installMockWebGpuRuntime(commonInput);

    try {
      await continuousPropagateOnWebGpu(commonInput);
      await continuousPropagateOnWebGpu(commonInput);
      await constrainedSmoothOnWebGpu({
        valueGrid: commonInput.valueGrid,
        rainMask: commonInput.rainMask,
        hardAnchorMask: commonInput.hardAnchorMask,
        softObsMask: commonInput.softObsMask,
        gridNeighbors: commonInput.gridNeighbors
      });
      await constrainedSmoothOnWebGpu({
        valueGrid: commonInput.valueGrid,
        rainMask: commonInput.rainMask,
        hardAnchorMask: commonInput.hardAnchorMask,
        softObsMask: commonInput.softObsMask,
        gridNeighbors: commonInput.gridNeighbors
      });
    } finally {
      runtime.restore();
    }

    expect(runtime.counters.requestDevice).toBe(1);
    expect(runtime.counters.createComputePipeline).toBe(2);
    expect(runtime.counters.createBuffer).toBe(21);
  });

  it("WebGL2 在同一 worker 内重复调用时应复用 context program VAO 和 uniform 位置", async () => {
    const runtime = installMockWebGl2Runtime(createCommonInput());

    try {
      await continuousPropagateOnWebGl2(createCommonInput());
      await constrainedSmoothOnWebGl2({
        valueGrid: new Float32Array([12, 8, 4]),
        rainMask: new Uint8Array([1, 1, 1]),
        hardAnchorMask: new Uint8Array([1, 0, 0]),
        softObsMask: new Uint8Array([0, 1, 0]),
        gridNeighbors: createLineNeighbors(3)
      });
      await continuousPropagateOnWebGl2({
        ...createCommonInput(),
        valueGrid: new Float32Array([12, 0, 8, 0, 4]),
        rainMask: new Uint8Array([1, 1, 1, 1, 1]),
        knownMask: new Uint8Array([1, 0, 1, 0, 1]),
        hardAnchorMask: new Uint8Array([1, 0, 0, 0, 0]),
        softObsMask: new Uint8Array([0, 1, 0, 1, 0]),
        gridNeighbors: createLineNeighbors(5),
        gridCenterX: new Float32Array([0, 1000, 2000, 3000, 4000]),
        gridCenterY: new Float32Array([0, 0, 0, 0, 0])
      });
      await constrainedSmoothOnWebGl2({
        valueGrid: new Float32Array([12, 10, 8, 6, 4]),
        rainMask: new Uint8Array([1, 1, 1, 1, 1]),
        hardAnchorMask: new Uint8Array([1, 0, 0, 0, 0]),
        softObsMask: new Uint8Array([0, 1, 0, 1, 0]),
        gridNeighbors: createLineNeighbors(5)
      });
    } finally {
      runtime.restore();
    }

    expect(runtime.counters.createContext).toBe(1);
    expect(runtime.counters.createShader).toBe(3);
    expect(runtime.counters.linkProgram).toBe(2);
    expect(runtime.counters.createVertexArray).toBe(1);
    expect(runtime.counters.getUniformLocation).toBe(12);
    expect(runtime.canvasWidths).toEqual([3, 3, 5]);
  });

  it("WebGL2 在同宽度重复调用时应复用纹理和 FBO，仅在宽度变化时扩容", async () => {
    const runtime = installMockWebGl2Runtime(createCommonInput());

    try {
      await continuousPropagateOnWebGl2(createCommonInput());
      await constrainedSmoothOnWebGl2({
        valueGrid: new Float32Array([12, 8, 4]),
        rainMask: new Uint8Array([1, 1, 1]),
        hardAnchorMask: new Uint8Array([1, 0, 0]),
        softObsMask: new Uint8Array([0, 1, 0]),
        gridNeighbors: createLineNeighbors(3)
      });

      expect(runtime.counters.createTexture).toBe(11);
      expect(runtime.counters.createFramebuffer).toBe(1);
      expect(runtime.counters.texImage2D).toBeGreaterThan(11);
      expect(runtime.counters.framebufferTexture2D).toBeGreaterThan(1);
      expect(runtime.counters.texParameteri).toBe(44);
      expect(runtime.readPixelsTargetsByWidth.get(3)?.size).toBe(1);

      await continuousPropagateOnWebGl2({
        ...createCommonInput(),
        valueGrid: new Float32Array([12, 0, 8, 0, 4]),
        rainMask: new Uint8Array([1, 1, 1, 1, 1]),
        knownMask: new Uint8Array([1, 0, 1, 0, 1]),
        hardAnchorMask: new Uint8Array([1, 0, 0, 0, 0]),
        softObsMask: new Uint8Array([0, 1, 0, 1, 0]),
        gridNeighbors: createLineNeighbors(5),
        gridCenterX: new Float32Array([0, 1000, 2000, 3000, 4000]),
        gridCenterY: new Float32Array([0, 0, 0, 0, 0])
      });

      expect(runtime.counters.createTexture).toBe(16);
      expect(runtime.counters.createFramebuffer).toBe(1);
      expect(runtime.counters.texParameteri).toBe(64);
      expect(runtime.readPixelsTargetsByWidth.get(5)?.size).toBe(1);
    } finally {
      runtime.restore();
    }
  });

  it("WebGL2 运行失败后单帧结果应降级为 CPU", async () => {
    const frame = {
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      frameType: FrameType.Rain5m,
      frameTime: "2026-06-24T13:55:00+08:00",
      stationIds: ["FIX-1", "ORD-1"],
      stationValues: new Float32Array([12, 4])
    };
    const runtime = installMockWebGl2Runtime(createCommonInput(), {
      failReadPixelsTimes: 1
    });

    try {
      const result = await runFrameOnCpu(frame, {
        assets: createAssets(),
        selectedBackend: "webgl2"
      });

      expect(result.selectedBackend).toBe("cpu");
    } finally {
      runtime.restore();
    }
  });
});

function maxAbsDiff(left: Float32Array, right: Float32Array) {
  let max = 0;
  for (let index = 0; index < left.length; index += 1) {
    max = Math.max(max, Math.abs(left[index] - right[index]));
  }
  return max;
}

function createAssets() {
  return {
    manifest: {
      protocol_version: "1.0.0",
      asset_version: "2026-06-bj-grid-v1",
      algorithm_profile_version: "rain-iso-profile-v1",
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
    gridMeta: {
      gridId: new Int32Array([0, 1, 2]),
      row: new Int32Array([0, 0, 0]),
      col: new Int32Array([0, 1, 2]),
      centerX: new Float32Array([0, 1000, 2000]),
      centerY: new Float32Array([0, 0, 0])
    },
    gridMask: new Uint8Array([1, 1, 1]),
    gridNeighbors: createLineNeighbors(3),
    stationToGrid: new Int32Array([0, 2]),
    stationMeta: {
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
    },
    fixedAnchorStationIds: new Set(["FIX-1"]),
    fallbackNeighborStationIdsByStationId: new Map()
  };
}

function createCommonInput() {
  return {
    valueGrid: new Float32Array([12, 0, 4]),
    rainMask: new Uint8Array([1, 1, 1]),
    knownMask: new Uint8Array([1, 0, 1]),
    hardAnchorMask: new Uint8Array([1, 0, 0]),
    softObsMask: new Uint8Array([0, 1, 0]),
    gridNeighbors: createLineNeighbors(3),
    gridCenterX: new Float32Array([0, 1000, 2000]),
    gridCenterY: new Float32Array([0, 0, 0]),
    ordinaryOnlyMode: false
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

function installMockWebGpuRuntime(commonInput: ReturnType<typeof createCommonInput>) {
  const globalLike = globalThis as typeof globalThis & {
    navigator?: Record<string, unknown>;
  };
  const previousNavigator = globalLike.navigator;
  const previousNavigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalLike,
    "navigator"
  );
  const counters = {
    requestAdapter: 0,
    requestDevice: 0,
    createComputePipeline: 0,
    createBuffer: 0,
    submit: 0
  };

  Object.defineProperty(globalLike, "navigator", {
    configurable: true,
    value: {
      gpu: {
        requestAdapter: async () => {
          counters.requestAdapter += 1;
          return {
            requestDevice: async () => {
              counters.requestDevice += 1;
              const submittedCommands: Array<{
                copies: Array<{
                  source: { data: ArrayBuffer };
                  sourceOffset: number;
                  destination: { data: ArrayBuffer };
                  destinationOffset: number;
                  size: number;
                }>;
              }> = [];
              return {
                createBuffer: ({ size }: { size: number }) => {
                  counters.createBuffer += 1;
                  return {
                    data: new ArrayBuffer(size),
                    destroy() {},
                    async mapAsync() {},
                    getMappedRange() {
                      return this.data;
                    },
                    unmap() {}
                  };
                },
                createShaderModule: () => ({}),
                createComputePipeline: () => {
                  counters.createComputePipeline += 1;
                  return {
                    getBindGroupLayout: () => ({})
                  };
                },
                createBindGroup: () => ({}),
                createCommandEncoder: () => {
                  const command = {
                    copies: [] as Array<{
                      source: { data: ArrayBuffer };
                      sourceOffset: number;
                      destination: { data: ArrayBuffer };
                      destinationOffset: number;
                      size: number;
                    }>
                  };
                  submittedCommands.push(command);
                  return {
                    beginComputePass: () => ({
                      setPipeline() {},
                      setBindGroup() {},
                      dispatchWorkgroups() {},
                      end() {}
                    }),
                    copyBufferToBuffer(
                      source: { data: ArrayBuffer },
                      sourceOffset: number,
                      destination: { data: ArrayBuffer },
                      destinationOffset: number,
                      size: number
                    ) {
                      command.copies.push({
                        source,
                        sourceOffset,
                        destination,
                        destinationOffset,
                        size
                      });
                    },
                    finish: () => command
                  };
                },
                queue: {
                  writeBuffer(
                    buffer: { data: ArrayBuffer },
                    bufferOffset: number,
                    data: ArrayBufferLike | ArrayBufferView
                  ) {
                    const source =
                      ArrayBuffer.isView(data)
                        ? new Uint8Array(
                            data.buffer,
                            data.byteOffset,
                            data.byteLength
                          )
                        : new Uint8Array(data);
                    const target = new Uint8Array(buffer.data);
                    target.set(
                      source.subarray(0, Math.max(0, target.length - bufferOffset)),
                      bufferOffset
                    );
                  },
                  submit() {
                    counters.submit += 1;
                    for (const command of submittedCommands.splice(0)) {
                      for (const copy of command.copies) {
                        const source = new Uint8Array(
                          copy.source.data,
                          copy.sourceOffset,
                          copy.size
                        );
                        new Uint8Array(
                          copy.destination.data,
                          copy.destinationOffset,
                          copy.size
                        ).set(source);
                      }
                    }
                  }
                }
              };
            }
          };
        }
      }
    }
  });

  return {
    counters,
    commonInput,
    restore() {
      if (previousNavigatorDescriptor) {
        Object.defineProperty(globalLike, "navigator", previousNavigatorDescriptor);
        return;
      }

      Object.defineProperty(globalLike, "navigator", {
        configurable: true,
        value: previousNavigator
      });
    }
  };
}

function installMockWebGl2Runtime(
  commonInput: ReturnType<typeof createCommonInput>,
  options: {
    failReadPixelsTimes?: number;
  } = {}
) {
  const globalLike = globalThis as typeof globalThis & {
    OffscreenCanvas?: new (width: number, height: number) => {
      getContext: (kind: string) => unknown;
    };
  };
  const previousCanvas = globalLike.OffscreenCanvas;
  const counters = {
    createContext: 0,
    createShader: 0,
    linkProgram: 0,
    createVertexArray: 0,
    getUniformLocation: 0,
    createTexture: 0,
    texImage2D: 0,
    texParameteri: 0,
    createFramebuffer: 0,
    framebufferTexture2D: 0,
    drawArrays: 0,
    readPixels: 0
  };
  const canvasWidths: number[] = [];
  const readPixelsTargetsByWidth = new Map<number, Set<Float32Array>>();
  let remainingReadPixelsFailures = options.failReadPixelsTimes ?? 0;
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
      counters.createShader += 1;
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
    linkProgram() {
      counters.linkProgram += 1;
    },
    getProgramParameter() {
      return true;
    },
    getProgramInfoLog() {
      return "";
    },
    useProgram() {},
    createTexture() {
      counters.createTexture += 1;
      return {};
    },
    bindTexture() {},
    texParameteri() {
      counters.texParameteri += 1;
    },
    texImage2D() {
      counters.texImage2D += 1;
    },
    createFramebuffer() {
      counters.createFramebuffer += 1;
      return {};
    },
    bindFramebuffer() {},
    framebufferTexture2D() {
      counters.framebufferTexture2D += 1;
    },
    viewport() {},
    activeTexture() {},
    clear() {},
    getExtension() {
      return {};
    },
    getUniformLocation() {
      counters.getUniformLocation += 1;
      return {};
    },
    uniform1i() {},
    uniform1f() {},
    uniform1ui() {},
    createBuffer() {
      return {};
    },
    createVertexArray() {
      counters.createVertexArray += 1;
      return {};
    },
    bindVertexArray() {},
    bindBuffer() {},
    bufferData() {},
    enableVertexAttribArray() {},
    vertexAttribPointer() {},
    drawArrays() {
      counters.drawArrays += 1;
    },
    readPixels(
      _x: number,
      _y: number,
      width: number,
      _height: number,
      _format: number,
      _type: number,
      pixels: Float32Array
    ) {
      counters.readPixels += 1;
      const targets = readPixelsTargetsByWidth.get(width) ?? new Set<Float32Array>();
      targets.add(pixels);
      readPixelsTargetsByWidth.set(width, targets);
      if (remainingReadPixelsFailures > 0) {
        remainingReadPixelsFailures -= 1;
        throw new Error("mock readPixels failure");
      }
    }
  };

  globalLike.OffscreenCanvas = class {
    private widthValue = 0;
    private heightValue = 0;

    constructor(width: number, height: number) {
      counters.createContext += 1;
      this.width = width;
      this.height = height;
    }

    set width(value: number) {
      this.widthValue = value;
      canvasWidths.push(value);
    }

    get width() {
      return this.widthValue;
    }

    set height(value: number) {
      this.heightValue = value;
    }

    get height() {
      return this.heightValue;
    }

    getContext(kind: string) {
      return kind === "webgl2" ? gl : null;
    }
  };

  return {
    counters,
    canvasWidths,
    readPixelsTargetsByWidth,
    commonInput,
    restore() {
      globalLike.OffscreenCanvas = previousCanvas;
    }
  };
}
