import { constrainedSmooth } from "../../cpu/constrained-smooth.js";
import {
  DEFAULT_SMOOTH_ROUNDS,
  DEFAULT_SOFT_OBS_MAX_DELTA
} from "../../cpu/smooth-params.js";
import {
  ensureWebGpuContext,
  getOrCreateWebGpuComputePipeline,
  getOrCreateWebGpuReadbackBuffer,
  getOrCreateWebGpuStorageBuffer
} from "./context.js";

const GPU_BUFFER_USAGE = {
  MAP_READ: 0x0001,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  STORAGE: 0x0080
} as const;

const GPU_MAP_MODE_READ = 0x0001;

type MinimalGpuBuffer = {
  destroy?: () => void;
  getMappedRange?: () => ArrayBuffer;
  mapAsync?: (mode: number) => Promise<void>;
  unmap?: () => void;
};

type MinimalGpuDevice = {
  createBindGroup: (descriptor: unknown) => unknown;
  createBuffer: (descriptor: {
    size: number;
    usage: number;
  }) => MinimalGpuBuffer;
  createCommandEncoder: () => {
    beginComputePass: () => {
      dispatchWorkgroups: (x: number, y?: number, z?: number) => void;
      end: () => void;
      setBindGroup: (index: number, bindGroup: unknown) => void;
      setPipeline: (pipeline: unknown) => void;
    };
    copyBufferToBuffer: (
      source: MinimalGpuBuffer,
      sourceOffset: number,
      destination: MinimalGpuBuffer,
      destinationOffset: number,
      size: number
    ) => void;
    finish: () => unknown;
  };
  createComputePipeline: (descriptor: unknown) => {
    getBindGroupLayout: (index: number) => unknown;
  };
  createShaderModule: (descriptor: unknown) => unknown;
  queue: {
    submit: (commands: unknown[]) => void;
    writeBuffer: (
      buffer: MinimalGpuBuffer,
      bufferOffset: number,
      data: ArrayBufferLike | ArrayBufferView
    ) => void;
  };
};

export async function constrainedSmoothOnWebGpu(
  input: Parameters<typeof constrainedSmooth>[0]
) {
  const context = await ensureWebGpuContext();
  if (!context) {
    return constrainedSmooth(input);
  }

  const device = context.device as MinimalGpuDevice;
  const rounds = input.rounds ?? DEFAULT_SMOOTH_ROUNDS;
  const softObsMaxDelta =
    input.softObsMaxDelta ?? DEFAULT_SOFT_OBS_MAX_DELTA;
  const gridCount = input.valueGrid.length;
  const valueByteLength = input.valueGrid.byteLength;

  const widthKey = `${gridCount}`;
  let currentValueBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:valueA:${widthKey}`,
    size: Math.max(4, alignTo4(valueByteLength)),
    initialData: input.valueGrid,
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  let nextValueBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:valueB:${widthKey}`,
    size: Math.max(4, alignTo4(valueByteLength)),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const originalValueBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:original:${widthKey}`,
    size: Math.max(4, alignTo4(valueByteLength)),
    initialData: input.valueGrid,
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const rainMaskBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:rain:${widthKey}`,
    size: Math.max(4, alignTo4(input.rainMask.byteLength * 4)),
    initialData: toUint32(input.rainMask),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const hardAnchorBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:hardAnchor:${widthKey}`,
    size: Math.max(4, alignTo4(input.hardAnchorMask.byteLength * 4)),
    initialData: toUint32(input.hardAnchorMask),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const softObsBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:softObs:${widthKey}`,
    size: Math.max(4, alignTo4(input.softObsMask.byteLength * 4)),
    initialData: toUint32(input.softObsMask),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const neighborBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:neighbor:${widthKey}`,
    size: Math.max(4, alignTo4(input.gridNeighbors.byteLength)),
    initialData: input.gridNeighbors,
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const paramsBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `smooth:params:${widthKey}`,
    size: 16,
    initialData: new Float32Array([gridCount, softObsMaxDelta, 0, 0]),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const pipeline = getOrCreateWebGpuComputePipeline({
    device,
    cacheKey: "constrained-smooth:v1",
    shaderCode: CONSTRAINED_SMOOTH_SHADER
  });

  for (let round = 0; round < rounds; round += 1) {
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: currentValueBuffer } },
        { binding: 1, resource: { buffer: nextValueBuffer } },
        { binding: 2, resource: { buffer: originalValueBuffer } },
        { binding: 3, resource: { buffer: rainMaskBuffer } },
        { binding: 4, resource: { buffer: hardAnchorBuffer } },
        { binding: 5, resource: { buffer: softObsBuffer } },
        { binding: 6, resource: { buffer: neighborBuffer } },
        { binding: 7, resource: { buffer: paramsBuffer } }
      ]
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(gridCount / 64));
    pass.end();
    device.queue.submit([encoder.finish()]);

    [currentValueBuffer, nextValueBuffer] = [nextValueBuffer, currentValueBuffer];
  }

  return readFloat32Array(device, currentValueBuffer, gridCount, `smooth:readback:${widthKey}`);
}

async function readFloat32Array(
  device: MinimalGpuDevice,
  source: MinimalGpuBuffer,
  length: number,
  cacheKey: string
) {
  const staging = getOrCreateWebGpuReadbackBuffer({
    device,
    cacheKey,
    size: length * 4,
    usage: GPU_BUFFER_USAGE.COPY_DST | GPU_BUFFER_USAGE.MAP_READ
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(source, 0, staging, 0, length * 4);
  device.queue.submit([encoder.finish()]);
  await staging.mapAsync?.(GPU_MAP_MODE_READ);
  const mapped = staging.getMappedRange?.() ?? new ArrayBuffer(length * 4);
  const result = new Float32Array(mapped.slice(0));
  staging.unmap?.();
  return result;
}

function alignTo4(size: number) {
  return Math.ceil(size / 4) * 4;
}

function toUint32(mask: Uint8Array) {
  return Uint32Array.from(mask, (value) => value);
}

const CONSTRAINED_SMOOTH_SHADER = `
struct Params {
  gridCount: f32,
  softObsMaxDelta: f32,
  _unused0: f32,
  _unused1: f32,
}

@group(0) @binding(0) var<storage, read> currentValue: array<f32>;
@group(0) @binding(1) var<storage, read_write> nextValue: array<f32>;
@group(0) @binding(2) var<storage, read> originalValue: array<f32>;
@group(0) @binding(3) var<storage, read> rainMask: array<u32>;
@group(0) @binding(4) var<storage, read> hardAnchorMask: array<u32>;
@group(0) @binding(5) var<storage, read> softObsMask: array<u32>;
@group(0) @binding(6) var<storage, read> gridNeighbors: array<i32>;
@group(0) @binding(7) var<storage, read> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let gridId = globalId.x;
  if (f32(gridId) >= params.gridCount) {
    return;
  }

  if (rainMask[gridId] != 1u || hardAnchorMask[gridId] == 1u) {
    nextValue[gridId] = currentValue[gridId];
    return;
  }

  var sum = currentValue[gridId];
  var count = 1.0;
  for (var offset = 0; offset < 8; offset = offset + 1) {
    let neighborId = gridNeighbors[gridId * 8u + u32(offset)];
    if (neighborId < 0 || rainMask[u32(neighborId)] != 1u) {
      continue;
    }

    sum = sum + currentValue[u32(neighborId)];
    count = count + 1.0;
  }

  let average = sum / count;
  if (softObsMask[gridId] == 1u) {
    let minValue = originalValue[gridId];
    let maxValue = originalValue[gridId] + params.softObsMaxDelta;
    nextValue[gridId] = clamp(average, minValue, maxValue);
    return;
  }

  nextValue[gridId] = average;
}`;
