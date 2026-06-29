import { continuousPropagate } from "../../cpu/continuous-propagate.js";
import {
  attachFramebufferTexture,
  getOrCreateWebGl2Runtime,
  getOrCreateScratchTexture,
  invalidateWebGl2Runtime,
  readFramebuffer,
  runFullscreenPass
} from "./runtime.js";
import { WEBGL2_PROGRAM_KEY } from "./program-definitions.js";

export async function continuousPropagateOnWebGl2(
  input: Parameters<typeof continuousPropagate>[0]
) {
  const runtime = getOrCreateWebGl2Runtime(input.valueGrid.length);
  if (!runtime) {
    return continuousPropagate(input);
  }

  try {
    const { gl } = runtime;
    const width = input.valueGrid.length;
    const statePixels = new Float32Array(width * 4);
    const maskPixels = new Float32Array(width * 4);
    const neighborsA = new Float32Array(width * 4);
    const neighborsB = new Float32Array(width * 4);

    for (let index = 0; index < width; index += 1) {
      const pixelOffset = index * 4;
      statePixels[pixelOffset] = input.valueGrid[index];
      statePixels[pixelOffset + 1] = input.knownMask[index];
      maskPixels[pixelOffset] = input.rainMask[index];
      maskPixels[pixelOffset + 1] = input.hardAnchorMask[index];

      for (let neighbor = 0; neighbor < 4; neighbor += 1) {
        neighborsA[pixelOffset + neighbor] = input.gridNeighbors[index * 8 + neighbor];
        neighborsB[pixelOffset + neighbor] =
          input.gridNeighbors[index * 8 + neighbor + 4];
      }
    }

    const stateAKey = `propagate:stateA:${width}`;
    const stateBKey = `propagate:stateB:${width}`;
    let useStateAAsCurrent = true;
    let currentStateTexture = getOrCreateScratchTexture({
      runtime,
      key: stateAKey,
      width,
      pixels: statePixels
    });
    let nextStateTexture = getOrCreateScratchTexture({
      runtime,
      key: stateBKey,
      width,
      pixels: statePixels
    });
    const maskTexture = getOrCreateScratchTexture({
      runtime,
      key: `propagate:mask:${width}`,
      width,
      pixels: maskPixels
    });
    const neighborTextureA = getOrCreateScratchTexture({
      runtime,
      key: `propagate:neighborA:${width}`,
      width,
      pixels: neighborsA
    });
    const neighborTextureB = getOrCreateScratchTexture({
      runtime,
      key: `propagate:neighborB:${width}`,
      width,
      pixels: neighborsB
    });
    let framebuffer = attachFramebufferTexture({
      runtime,
      texture: nextStateTexture
    });

    let finalPixels = statePixels;
    while (true) {
      runFullscreenPass({
        runtime,
        programKey: WEBGL2_PROGRAM_KEY.ContinuousPropagate,
        width,
        framebuffer,
        uniforms: [{ name: "uGridCount", type: "int", value: width }],
        textures: [
          { texture: currentStateTexture, unit: 0, uniformName: "uStateTex" },
          { texture: maskTexture, unit: 1, uniformName: "uMaskTex" },
          { texture: neighborTextureA, unit: 2, uniformName: "uNeighborTexA" },
          { texture: neighborTextureB, unit: 3, uniformName: "uNeighborTexB" }
        ]
      });

      finalPixels = readFramebuffer(runtime, width);
      const changed = hasChanged(finalPixels);
      if (!changed) {
        break;
      }

      const nextPixels = finalPixels;
      currentStateTexture = nextStateTexture;
      useStateAAsCurrent = !useStateAAsCurrent;
      nextStateTexture = getOrCreateScratchTexture({
        runtime,
        key: useStateAAsCurrent ? stateBKey : stateAKey,
        width,
        pixels: nextPixels
      });
      framebuffer = attachFramebufferTexture({
        runtime,
        texture: nextStateTexture
      });
    }

    return {
      valueGrid: extractChannel(finalPixels, 0),
      knownMask: toUint8Mask(extractChannel(finalPixels, 1))
    };
  } catch (error) {
    invalidateWebGl2Runtime();
    throw error;
  }
}

function hasChanged(pixels: Float32Array) {
  for (let index = 2; index < pixels.length; index += 4) {
    if (pixels[index] >= 0.5) {
      return true;
    }
  }
  return false;
}

function extractChannel(pixels: Float32Array, channel: number) {
  const result = new Float32Array(pixels.length / 4);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = pixels[index * 4 + channel];
  }
  return result;
}

function toUint8Mask(values: Float32Array) {
  const result = new Uint8Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    result[index] = values[index] >= 0.5 ? 1 : 0;
  }
  return result;
}
