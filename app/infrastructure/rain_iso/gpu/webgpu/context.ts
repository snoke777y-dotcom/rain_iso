type MinimalGpuBuffer = {
  destroy?: () => void;
  getMappedRange?: () => ArrayBuffer;
  mapAsync?: (mode: number) => Promise<void>;
  unmap?: () => void;
};

type MinimalGpuQueue = {
  submit: (commands: unknown[]) => void;
  writeBuffer: (
    buffer: MinimalGpuBuffer,
    bufferOffset: number,
    data: ArrayBufferLike | ArrayBufferView
  ) => void;
};

type MinimalGpuDevice = {
  createBindGroup: (descriptor: unknown) => unknown;
  createBuffer: (descriptor: unknown) => MinimalGpuBuffer;
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
  queue: MinimalGpuQueue;
};

export type MinimalGpuComputePipeline = ReturnType<
  MinimalGpuDevice["createComputePipeline"]
>;

type MinimalGpuAdapter = {
  info?: {
    description?: string;
  };
  requestDevice: () => Promise<MinimalGpuDevice>;
};

type MinimalGpuNavigator = {
  gpu?: {
    requestAdapter?: () => Promise<MinimalGpuAdapter | null | undefined>;
  };
};

export type WebGpuContext = {
  kind: "webgpu";
  adapterName?: string;
  device: MinimalGpuDevice;
};

let cachedContext: WebGpuContext | null = null;
let cachedContextPromise: Promise<WebGpuContext | null> | null = null;
let cachedRequestAdapter: unknown = null;
const cachedPipelinesByDevice = new WeakMap<
  MinimalGpuDevice,
  Map<string, MinimalGpuComputePipeline>
>();
const cachedStorageBuffersByDevice = new WeakMap<
  MinimalGpuDevice,
  Map<string, { buffer: MinimalGpuBuffer; size: number }>
>();
const cachedReadbackBuffersByDevice = new WeakMap<
  MinimalGpuDevice,
  Map<string, { buffer: MinimalGpuBuffer; size: number }>
>();

export async function ensureWebGpuContext(): Promise<WebGpuContext | null> {
  const navigatorLike = (globalThis as typeof globalThis & {
    navigator?: MinimalGpuNavigator;
  }).navigator;
  const requestAdapter = navigatorLike?.gpu?.requestAdapter;

  if (!requestAdapter) {
    cachedContext = null;
    cachedContextPromise = null;
    cachedRequestAdapter = null;
    return null;
  }

  if (cachedRequestAdapter !== requestAdapter) {
    cachedContext = null;
    cachedContextPromise = null;
    cachedRequestAdapter = requestAdapter;
  }

  if (cachedContext) {
    return cachedContext;
  }

  if (!cachedContextPromise) {
    cachedContextPromise = (async () => {
      const adapter = await requestAdapter.call(navigatorLike.gpu);
      if (!adapter) {
        return null;
      }

      const device = await adapter.requestDevice();
      return {
        kind: "webgpu" as const,
        adapterName: adapter.info?.description,
        device
      };
    })();
  }

  cachedContext = await cachedContextPromise;
  return cachedContext;
}

export function getReadyWebGpuContext(): WebGpuContext | null {
  return cachedContext;
}

export function getOrCreateWebGpuComputePipeline(options: {
  device: MinimalGpuDevice;
  cacheKey: string;
  shaderCode: string;
  entryPoint?: string;
}): MinimalGpuComputePipeline {
  let pipelines = cachedPipelinesByDevice.get(options.device);
  if (!pipelines) {
    pipelines = new Map();
    cachedPipelinesByDevice.set(options.device, pipelines);
  }

  const cached = pipelines.get(options.cacheKey);
  if (cached) {
    return cached;
  }

  const pipeline = options.device.createComputePipeline({
    layout: "auto",
    compute: {
      module: options.device.createShaderModule({
        code: options.shaderCode
      }),
      entryPoint: options.entryPoint ?? "main"
    }
  });
  pipelines.set(options.cacheKey, pipeline);
  return pipeline;
}

export function getOrCreateWebGpuStorageBuffer(options: {
  device: MinimalGpuDevice;
  cacheKey: string;
  size: number;
  initialData?: ArrayBufferView;
  usage: number;
}) {
  let buffers = cachedStorageBuffersByDevice.get(options.device);
  if (!buffers) {
    buffers = new Map();
    cachedStorageBuffersByDevice.set(options.device, buffers);
  }

  let entry = buffers.get(options.cacheKey);
  if (!entry || entry.size !== options.size) {
    entry?.buffer.destroy?.();
    entry = {
      size: options.size,
      buffer: options.device.createBuffer({
        size: options.size,
        usage: options.usage
      })
    };
    buffers.set(options.cacheKey, entry);
  }

  if (options.initialData) {
    options.device.queue.writeBuffer(entry.buffer, 0, options.initialData);
  }

  return entry.buffer;
}

export function getOrCreateWebGpuReadbackBuffer(options: {
  device: MinimalGpuDevice;
  cacheKey: string;
  size: number;
  usage: number;
}) {
  let buffers = cachedReadbackBuffersByDevice.get(options.device);
  if (!buffers) {
    buffers = new Map();
    cachedReadbackBuffersByDevice.set(options.device, buffers);
  }

  let entry = buffers.get(options.cacheKey);
  if (!entry || entry.size !== options.size) {
    entry?.buffer.destroy?.();
    entry = {
      size: options.size,
      buffer: options.device.createBuffer({
        size: options.size,
        usage: options.usage
      })
    };
    buffers.set(options.cacheKey, entry);
  }

  return entry.buffer;
}
