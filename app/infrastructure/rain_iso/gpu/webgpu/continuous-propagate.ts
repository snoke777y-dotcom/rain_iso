import { continuousPropagate } from "../../cpu/continuous-propagate.js";
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

export async function continuousPropagateOnWebGpu(
  input: Parameters<typeof continuousPropagate>[0]
) {
  const context = await ensureWebGpuContext();
  if (!context) {
    return continuousPropagate(input);
  }

  const device = context.device as MinimalGpuDevice;
  const gridCount = input.valueGrid.length;
  const valueByteLength = input.valueGrid.byteLength;
  const maskByteLength = input.knownMask.byteLength;
  const neighborByteLength = input.gridNeighbors.byteLength;

  const widthKey = `${gridCount}`;
  let currentValueBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:valueA:${widthKey}`,
    size: Math.max(4, alignTo4(valueByteLength)),
    initialData: input.valueGrid,
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  let currentKnownBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:knownA:${widthKey}`,
    size: Math.max(4, alignTo4(maskByteLength * 4)),
    initialData: toUint32(input.knownMask),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  let nextValueBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:valueB:${widthKey}`,
    size: Math.max(4, alignTo4(valueByteLength)),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  let nextKnownBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:knownB:${widthKey}`,
    size: Math.max(4, alignTo4(maskByteLength * 4)),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const rainMaskBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:rain:${widthKey}`,
    size: Math.max(4, alignTo4(maskByteLength * 4)),
    initialData: toUint32(input.rainMask),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const hardAnchorBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:hardAnchor:${widthKey}`,
    size: Math.max(4, alignTo4(maskByteLength * 4)),
    initialData: toUint32(input.hardAnchorMask),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const neighborBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:neighbor:${widthKey}`,
    size: Math.max(4, alignTo4(neighborByteLength)),
    initialData: input.gridNeighbors,
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const changeBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:change:${widthKey}`,
    size: Math.max(4, alignTo4(maskByteLength * 4)),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const paramsBuffer = getOrCreateWebGpuStorageBuffer({
    device,
    cacheKey: `propagate:params:${widthKey}`,
    size: 16,
    initialData: new Uint32Array([gridCount]),
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC
  });
  const pipeline = getOrCreateWebGpuComputePipeline({
    device,
    cacheKey: "continuous-propagate:v1",
    shaderCode: CONTINUOUS_PROPAGATE_SHADER
  });

  while (true) {
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: currentValueBuffer } },
        { binding: 1, resource: { buffer: currentKnownBuffer } },
        { binding: 2, resource: { buffer: nextValueBuffer } },
        { binding: 3, resource: { buffer: nextKnownBuffer } },
        { binding: 4, resource: { buffer: rainMaskBuffer } },
        { binding: 5, resource: { buffer: hardAnchorBuffer } },
        { binding: 6, resource: { buffer: neighborBuffer } },
        { binding: 7, resource: { buffer: changeBuffer } },
        { binding: 8, resource: { buffer: paramsBuffer } }
      ]
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(gridCount / 64));
    pass.end();
    device.queue.submit([encoder.finish()]);

    const changed = await readUint32Array(
      device,
      changeBuffer,
      gridCount,
      `propagate:change-readback:${widthKey}`
    );
    if (!hasAnyChange(changed)) {
      const valueGrid = await readFloat32Array(
        device,
        nextValueBuffer,
        gridCount,
        `propagate:value-readback:${widthKey}`
      );
      const knownMask = toUint8(
        await readUint32Array(
          device,
          nextKnownBuffer,
          gridCount,
          `propagate:known-readback:${widthKey}`
        )
      );
      return { valueGrid, knownMask };
    }

    [currentValueBuffer, nextValueBuffer] = [nextValueBuffer, currentValueBuffer];
    [currentKnownBuffer, nextKnownBuffer] = [nextKnownBuffer, currentKnownBuffer];
  }
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

async function readUint32Array(
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
  const result = new Uint32Array(mapped.slice(0));
  staging.unmap?.();
  return result;
}

function alignTo4(size: number) {
  return Math.ceil(size / 4) * 4;
}

function toUint32(mask: Uint8Array) {
  return Uint32Array.from(mask, (value) => value);
}

function toUint8(mask: Uint32Array) {
  return Uint8Array.from(mask, (value) => (value > 0 ? 1 : 0));
}

function hasAnyChange(changed: Uint32Array) {
  for (const value of changed) {
    if (value !== 0) {
      return true;
    }
  }
  return false;
}

const CONTINUOUS_PROPAGATE_SHADER = `
struct Params {
  gridCount: u32,
}

@group(0) @binding(0) var<storage, read> valueCurrent: array<f32>;
@group(0) @binding(1) var<storage, read> knownCurrent: array<u32>;
@group(0) @binding(2) var<storage, read_write> valueNext: array<f32>;
@group(0) @binding(3) var<storage, read_write> knownNext: array<u32>;
@group(0) @binding(4) var<storage, read> rainMask: array<u32>;
@group(0) @binding(5) var<storage, read> hardAnchorMask: array<u32>;
@group(0) @binding(6) var<storage, read> gridNeighbors: array<i32>;
@group(0) @binding(7) var<storage, read_write> changedFlags: array<u32>;
@group(0) @binding(8) var<storage, read> params: Params;

fn lowerMedian(values: ptr<function, array<f32, 8>>, count: i32) -> f32 {
  for (var i = 1; i < count; i = i + 1) {
    let current = (*values)[i];
    var j = i - 1;
    loop {
      if (j < 0 || (*values)[j] <= current) {
        break;
      }
      (*values)[j + 1] = (*values)[j];
      j = j - 1;
    }
    (*values)[j + 1] = current;
  }

  return (*values)[(count - 1) / 2];
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
  let gridId = globalId.x;
  if (gridId >= params.gridCount) {
    return;
  }

  if (rainMask[gridId] == 0u || knownCurrent[gridId] == 1u) {
    valueNext[gridId] = valueCurrent[gridId];
    knownNext[gridId] = knownCurrent[gridId];
    changedFlags[gridId] = 0u;
    return;
  }

  var ordinary: array<f32, 8>;
  var anchor: array<f32, 8>;
  var ordinaryCount = 0;
  var anchorCount = 0;

  for (var offset = 0; offset < 8; offset = offset + 1) {
    let neighborId = gridNeighbors[gridId * 8u + u32(offset)];
    if (neighborId < 0 || knownCurrent[u32(neighborId)] == 0u) {
      continue;
    }

    let value = valueCurrent[u32(neighborId)];
    if (hardAnchorMask[u32(neighborId)] == 1u) {
      anchor[anchorCount] = value;
      anchorCount = anchorCount + 1;
    } else {
      ordinary[ordinaryCount] = value;
      ordinaryCount = ordinaryCount + 1;
    }
  }

  if (ordinaryCount > 0) {
    valueNext[gridId] = lowerMedian(&ordinary, ordinaryCount);
    knownNext[gridId] = 1u;
    changedFlags[gridId] = 1u;
    return;
  }

  if (anchorCount > 0) {
    valueNext[gridId] = lowerMedian(&anchor, anchorCount);
    knownNext[gridId] = 1u;
    changedFlags[gridId] = 1u;
    return;
  }

  valueNext[gridId] = valueCurrent[gridId];
  knownNext[gridId] = knownCurrent[gridId];
  changedFlags[gridId] = 0u;
}`;
