import {
  WEBGL2_PROGRAM_DEFINITIONS,
  WEBGL2_PROGRAM_KEY,
  WEBGL2_VERTEX_SHADER_SOURCE,
  type WebGl2ProgramKey
} from "./program-definitions.js";

const GL = {
  CLAMP_TO_EDGE: 0x812f,
  COLOR_ATTACHMENT0: 0x8ce0,
  COLOR_BUFFER_BIT: 0x4000,
  COMPILE_STATUS: 0x8b81,
  FLOAT: 0x1406,
  FRAMEBUFFER: 0x8d40,
  FRAGMENT_SHADER: 0x8b30,
  LINK_STATUS: 0x8b82,
  NEAREST: 0x2600,
  RGBA: 0x1908,
  RGBA32F: 0x8814,
  TEXTURE0: 0x84c0,
  TEXTURE_2D: 0x0de1,
  TEXTURE_MAG_FILTER: 0x2800,
  TEXTURE_MIN_FILTER: 0x2801,
  TEXTURE_WRAP_S: 0x2802,
  TEXTURE_WRAP_T: 0x2803,
  TRIANGLES: 0x0004,
  VERTEX_SHADER: 0x8b31
} as const;

export type MinimalWebGlProgram = object;
type MinimalWebGlShader = object;
export type MinimalWebGlTexture = object;
export type MinimalWebGlFramebuffer = object;
type MinimalWebGlVertexArray = object;
type MinimalWebGlUniformLocation = object | null;

type MinimalWebGlCanvas = {
  width: number;
  height: number;
  getContext: (kind: string) => unknown;
};

export type MinimalWebGl2Context = {
  COLOR_ATTACHMENT0?: number;
  COLOR_BUFFER_BIT?: number;
  COMPILE_STATUS?: number;
  FLOAT?: number;
  FRAMEBUFFER?: number;
  FRAGMENT_SHADER?: number;
  LINK_STATUS?: number;
  RGBA?: number;
  RGBA32F?: number;
  TEXTURE0?: number;
  TEXTURE_2D?: number;
  TEXTURE_MAG_FILTER?: number;
  TEXTURE_MIN_FILTER?: number;
  TEXTURE_WRAP_S?: number;
  TEXTURE_WRAP_T?: number;
  TRIANGLES?: number;
  VERTEX_SHADER?: number;
  activeTexture: (texture: number) => void;
  attachShader: (program: MinimalWebGlProgram, shader: MinimalWebGlShader) => void;
  bindFramebuffer: (target: number, framebuffer: MinimalWebGlFramebuffer | null) => void;
  bindTexture: (target: number, texture: MinimalWebGlTexture | null) => void;
  bindVertexArray?: (vao: MinimalWebGlVertexArray | null) => void;
  clear: (mask: number) => void;
  compileShader: (shader: MinimalWebGlShader) => void;
  createFramebuffer: () => MinimalWebGlFramebuffer | null;
  createProgram: () => MinimalWebGlProgram | null;
  createShader: (type: number) => MinimalWebGlShader | null;
  createTexture: () => MinimalWebGlTexture | null;
  createVertexArray?: () => MinimalWebGlVertexArray | null;
  drawArrays: (mode: number, first: number, count: number) => void;
  framebufferTexture2D: (
    target: number,
    attachment: number,
    textarget: number,
    texture: MinimalWebGlTexture | null,
    level: number
  ) => void;
  getExtension: (name: string) => unknown;
  getProgramInfoLog: (program: MinimalWebGlProgram) => string | null;
  getProgramParameter: (program: MinimalWebGlProgram, pname: number) => boolean;
  getShaderInfoLog: (shader: MinimalWebGlShader) => string | null;
  getShaderParameter: (shader: MinimalWebGlShader, pname: number) => boolean;
  getUniformLocation: (
    program: MinimalWebGlProgram,
    name: string
  ) => MinimalWebGlUniformLocation;
  linkProgram: (program: MinimalWebGlProgram) => void;
  readPixels: (
    x: number,
    y: number,
    width: number,
    height: number,
    format: number,
    type: number,
    pixels: Float32Array
  ) => void;
  shaderSource: (shader: MinimalWebGlShader, source: string) => void;
  texImage2D: (
    target: number,
    level: number,
    internalFormat: number,
    width: number,
    height: number,
    border: number,
    format: number,
    type: number,
    pixels: Float32Array | null
  ) => void;
  texParameteri: (target: number, pname: number, param: number) => void;
  uniform1f?: (location: MinimalWebGlUniformLocation, value: number) => void;
  uniform1i: (location: MinimalWebGlUniformLocation, value: number) => void;
  useProgram: (program: MinimalWebGlProgram | null) => void;
  viewport: (x: number, y: number, width: number, height: number) => void;
};

export type WebGl2RuntimeProgram = {
  program: MinimalWebGlProgram;
  uniforms: Record<string, MinimalWebGlUniformLocation>;
};

export type WebGl2Runtime = {
  canvas: MinimalWebGlCanvas;
  gl: MinimalWebGl2Context;
  vao: MinimalWebGlVertexArray | null;
  programs: Record<WebGl2ProgramKey, WebGl2RuntimeProgram>;
  scratchTextures: Map<string, MinimalWebGlTexture>;
  initializedTextures: Set<MinimalWebGlTexture>;
  readbackBuffers: Map<number, Float32Array>;
  framebuffer: MinimalWebGlFramebuffer;
};

let cachedRuntime: WebGl2Runtime | null = null;
let cachedCanvasFactoryIdentity: unknown = null;

export function getOrCreateWebGl2Runtime(width: number): WebGl2Runtime | null {
  const canvasFactoryIdentity = getCanvasFactoryIdentity();
  if (cachedCanvasFactoryIdentity !== canvasFactoryIdentity) {
    cachedRuntime = null;
    cachedCanvasFactoryIdentity = canvasFactoryIdentity;
  }

  if (cachedRuntime) {
    resizeRuntimeCanvas(cachedRuntime, width);
    return cachedRuntime;
  }

  const canvas = createWebGl2Canvas(width);
  if (!canvas) {
    return null;
  }

  const gl = canvas.getContext("webgl2") as MinimalWebGl2Context | null;
  if (!gl) {
    return null;
  }

  if (!gl.getExtension("EXT_color_buffer_float")) {
    return null;
  }

  try {
    const vertexShader = createVertexShader(gl);
    const runtime: WebGl2Runtime = {
      canvas,
      gl,
      vao: gl.createVertexArray?.() ?? null,
      framebuffer: must(gl.createFramebuffer()),
      scratchTextures: new Map(),
      initializedTextures: new Set(),
      readbackBuffers: new Map(),
      programs: {
        [WEBGL2_PROGRAM_KEY.ContinuousPropagate]: buildProgram(
          gl,
          WEBGL2_PROGRAM_KEY.ContinuousPropagate,
          vertexShader
        ),
        [WEBGL2_PROGRAM_KEY.ConstrainedSmooth]: buildProgram(
          gl,
          WEBGL2_PROGRAM_KEY.ConstrainedSmooth,
          vertexShader
        )
      }
    };

    cachedRuntime = runtime;
    return runtime;
  } catch (error) {
    cachedRuntime = null;
    throw error;
  }
}

export function invalidateWebGl2Runtime() {
  cachedRuntime = null;
}

export function createFloatTexture(
  gl: MinimalWebGl2Context,
  width: number,
  pixels: Float32Array
) {
  const texture = must(gl.createTexture());
  gl.bindTexture(gl.TEXTURE_2D ?? GL.TEXTURE_2D, texture);
  gl.texParameteri(
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER ?? GL.TEXTURE_MIN_FILTER,
    GL.NEAREST
  );
  gl.texParameteri(
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER ?? GL.TEXTURE_MAG_FILTER,
    GL.NEAREST
  );
  gl.texParameteri(
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    gl.TEXTURE_WRAP_S ?? GL.TEXTURE_WRAP_S,
    GL.CLAMP_TO_EDGE
  );
  gl.texParameteri(
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    gl.TEXTURE_WRAP_T ?? GL.TEXTURE_WRAP_T,
    GL.CLAMP_TO_EDGE
  );
  gl.texImage2D(
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    0,
    gl.RGBA32F ?? GL.RGBA32F,
    width,
    1,
    0,
    gl.RGBA ?? GL.RGBA,
    gl.FLOAT ?? GL.FLOAT,
    pixels
  );
  return texture;
}

export function createFramebuffer(
  gl: MinimalWebGl2Context,
  texture: MinimalWebGlTexture | null
) {
  const framebuffer = must(gl.createFramebuffer());
  gl.bindFramebuffer(gl.FRAMEBUFFER ?? GL.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER ?? GL.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0 ?? GL.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    texture,
    0
  );
  return framebuffer;
}

export function getOrCreateScratchTexture(options: {
  runtime: WebGl2Runtime;
  key: string;
  width: number;
  pixels: Float32Array;
}) {
  const { gl } = options.runtime;
  let texture = options.runtime.scratchTextures.get(options.key) ?? null;
  if (!texture) {
    texture = must(gl.createTexture());
    options.runtime.scratchTextures.set(options.key, texture);
  }

  gl.bindTexture(gl.TEXTURE_2D ?? GL.TEXTURE_2D, texture);
  if (!options.runtime.initializedTextures.has(texture)) {
    gl.texParameteri(
      gl.TEXTURE_2D ?? GL.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER ?? GL.TEXTURE_MIN_FILTER,
      GL.NEAREST
    );
    gl.texParameteri(
      gl.TEXTURE_2D ?? GL.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER ?? GL.TEXTURE_MAG_FILTER,
      GL.NEAREST
    );
    gl.texParameteri(
      gl.TEXTURE_2D ?? GL.TEXTURE_2D,
      gl.TEXTURE_WRAP_S ?? GL.TEXTURE_WRAP_S,
      GL.CLAMP_TO_EDGE
    );
    gl.texParameteri(
      gl.TEXTURE_2D ?? GL.TEXTURE_2D,
      gl.TEXTURE_WRAP_T ?? GL.TEXTURE_WRAP_T,
      GL.CLAMP_TO_EDGE
    );
    options.runtime.initializedTextures.add(texture);
  }
  gl.texImage2D(
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    0,
    gl.RGBA32F ?? GL.RGBA32F,
    options.width,
    1,
    0,
    gl.RGBA ?? GL.RGBA,
    gl.FLOAT ?? GL.FLOAT,
    options.pixels
  );
  return texture;
}

export function attachFramebufferTexture(options: {
  runtime: WebGl2Runtime;
  texture: MinimalWebGlTexture | null;
}) {
  const { gl } = options.runtime;
  gl.bindFramebuffer(gl.FRAMEBUFFER ?? GL.FRAMEBUFFER, options.runtime.framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER ?? GL.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0 ?? GL.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D ?? GL.TEXTURE_2D,
    options.texture,
    0
  );
  return options.runtime.framebuffer;
}

export function runFullscreenPass(options: {
  runtime: WebGl2Runtime;
  programKey: WebGl2ProgramKey;
  width: number;
  framebuffer: MinimalWebGlFramebuffer | null;
  uniforms?: Array<{
    name: string;
    type: "int" | "float";
    value: number;
  }>;
  textures: Array<{
    texture: MinimalWebGlTexture | null;
    unit: number;
    uniformName: string;
  }>;
}) {
  const { gl } = options.runtime;
  const program = options.runtime.programs[options.programKey];
  gl.useProgram(program.program);
  gl.viewport(0, 0, options.width, 1);
  gl.bindFramebuffer(gl.FRAMEBUFFER ?? GL.FRAMEBUFFER, options.framebuffer);
  gl.bindVertexArray?.(options.runtime.vao);
  gl.clear(gl.COLOR_BUFFER_BIT ?? GL.COLOR_BUFFER_BIT);

  for (const textureBinding of options.textures) {
    gl.activeTexture((gl.TEXTURE0 ?? GL.TEXTURE0) + textureBinding.unit);
    gl.bindTexture(gl.TEXTURE_2D ?? GL.TEXTURE_2D, textureBinding.texture);
    gl.uniform1i(
      program.uniforms[textureBinding.uniformName] ?? null,
      textureBinding.unit
    );
  }

  for (const uniform of options.uniforms ?? []) {
    const location = program.uniforms[uniform.name] ?? null;
    if (uniform.type === "float") {
      gl.uniform1f?.(location, uniform.value);
      continue;
    }
    gl.uniform1i(location, uniform.value);
  }

  gl.drawArrays(gl.TRIANGLES ?? GL.TRIANGLES, 0, 3);
}

export function readFramebuffer(
  runtime: WebGl2Runtime,
  width: number
) {
  const { gl } = runtime;
  let pixels = runtime.readbackBuffers.get(width);
  if (!pixels) {
    pixels = new Float32Array(width * 4);
    runtime.readbackBuffers.set(width, pixels);
  }
  gl.readPixels(
    0,
    0,
    width,
    1,
    gl.RGBA ?? GL.RGBA,
    gl.FLOAT ?? GL.FLOAT,
    pixels
  );
  return pixels;
}

function createWebGl2Canvas(width: number): MinimalWebGlCanvas | null {
  const globalLike = globalThis as typeof globalThis & {
    OffscreenCanvas?: new (width: number, height: number) => MinimalWebGlCanvas;
    document?: {
      createElement?: (tag: string) => MinimalWebGlCanvas;
    };
  };

  const canvas =
    typeof globalLike.OffscreenCanvas === "function"
      ? new globalLike.OffscreenCanvas(width, 1)
      : globalLike.document?.createElement?.("canvas");
  if (!canvas) {
    return null;
  }

  canvas.width = width;
  canvas.height = 1;
  return canvas;
}

function getCanvasFactoryIdentity() {
  const globalLike = globalThis as typeof globalThis & {
    OffscreenCanvas?: unknown;
    document?: {
      createElement?: unknown;
    };
  };

  return globalLike.OffscreenCanvas ?? globalLike.document?.createElement ?? null;
}

function resizeRuntimeCanvas(runtime: WebGl2Runtime, width: number) {
  if (runtime.canvas.width !== width) {
    runtime.canvas.width = width;
  }
  if (runtime.canvas.height !== 1) {
    runtime.canvas.height = 1;
  }
}

function buildProgram(
  gl: MinimalWebGl2Context,
  key: WebGl2ProgramKey,
  vertexShader: MinimalWebGlShader
): WebGl2RuntimeProgram {
  const fragmentShader = must(gl.createShader(gl.FRAGMENT_SHADER ?? GL.FRAGMENT_SHADER));
  gl.shaderSource(fragmentShader, WEBGL2_PROGRAM_DEFINITIONS[key].fragmentSource);
  gl.compileShader(fragmentShader);
  if (
    !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS ?? GL.COMPILE_STATUS)
  ) {
    throw new Error(
      gl.getShaderInfoLog(fragmentShader) ?? "WebGL2 fragment shader compile failed"
    );
  }

  const program = must(gl.createProgram());
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS ?? GL.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "WebGL2 program link failed");
  }

  const uniforms = Object.fromEntries(
    WEBGL2_PROGRAM_DEFINITIONS[key].uniformNames.map((name) => [
      name,
      gl.getUniformLocation(program, name)
    ])
  );

  return {
    program,
    uniforms
  };
}

function createVertexShader(gl: MinimalWebGl2Context) {
  const vertexShader = must(gl.createShader(gl.VERTEX_SHADER ?? GL.VERTEX_SHADER));
  gl.shaderSource(vertexShader, WEBGL2_VERTEX_SHADER_SOURCE);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS ?? GL.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(vertexShader) ?? "WebGL2 vertex shader compile failed");
  }
  return vertexShader;
}

function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("WebGL2 runtime returned null");
  }
  return value;
}
