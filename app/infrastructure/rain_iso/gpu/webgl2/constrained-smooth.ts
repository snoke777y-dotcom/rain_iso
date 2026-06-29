import { constrainedSmooth } from "../../cpu/constrained-smooth.js";
import {
  DEFAULT_SMOOTH_ROUNDS,
  DEFAULT_SOFT_OBS_MAX_DELTA
} from "../../cpu/smooth-params.js";
import {
  attachFramebufferTexture,
  getOrCreateWebGl2Runtime,
  getOrCreateScratchTexture,
  invalidateWebGl2Runtime,
  readFramebuffer,
  runFullscreenPass
} from "./runtime.js";
import { WEBGL2_PROGRAM_KEY } from "./program-definitions.js";

export async function constrainedSmoothOnWebGl2(
  input: Parameters<typeof constrainedSmooth>[0]
) {
  const runtime = getOrCreateWebGl2Runtime(input.valueGrid.length);
  if (!runtime) {
    return constrainedSmooth(input);
  }

  try {
    const { gl } = runtime;
    const width = input.valueGrid.length;
    const rounds = input.rounds ?? DEFAULT_SMOOTH_ROUNDS;
    const softObsMaxDelta =
      input.softObsMaxDelta ?? DEFAULT_SOFT_OBS_MAX_DELTA;
    const valuePixels = new Float32Array(width * 4);
    const originalPixels = new Float32Array(width * 4);
    const maskPixels = new Float32Array(width * 4);
    const neighborsA = new Float32Array(width * 4);
    const neighborsB = new Float32Array(width * 4);

    for (let index = 0; index < width; index += 1) {
      const pixelOffset = index * 4;
      valuePixels[pixelOffset] = input.valueGrid[index];
      originalPixels[pixelOffset] = input.valueGrid[index];
      maskPixels[pixelOffset] = input.rainMask[index];
      maskPixels[pixelOffset + 1] = input.hardAnchorMask[index];
      maskPixels[pixelOffset + 2] = input.softObsMask[index];

      for (let neighbor = 0; neighbor < 4; neighbor += 1) {
        neighborsA[pixelOffset + neighbor] = input.gridNeighbors[index * 8 + neighbor];
        neighborsB[pixelOffset + neighbor] =
          input.gridNeighbors[index * 8 + neighbor + 4];
      }
    }

    const valueAKey = `smooth:valueA:${width}`;
    const valueBKey = `smooth:valueB:${width}`;
    let useValueAAsCurrent = true;
    let currentValueTexture = getOrCreateScratchTexture({
      runtime,
      key: valueAKey,
      width,
      pixels: valuePixels
    });
    let nextValueTexture = getOrCreateScratchTexture({
      runtime,
      key: valueBKey,
      width,
      pixels: valuePixels
    });
    const originalTexture = getOrCreateScratchTexture({
      runtime,
      key: `smooth:original:${width}`,
      width,
      pixels: originalPixels
    });
    const maskTexture = getOrCreateScratchTexture({
      runtime,
      key: `smooth:mask:${width}`,
      width,
      pixels: maskPixels
    });
    const neighborTextureA = getOrCreateScratchTexture({
      runtime,
      key: `smooth:neighborA:${width}`,
      width,
      pixels: neighborsA
    });
    const neighborTextureB = getOrCreateScratchTexture({
      runtime,
      key: `smooth:neighborB:${width}`,
      width,
      pixels: neighborsB
    });
    let framebuffer = attachFramebufferTexture({
      runtime,
      texture: nextValueTexture
    });
    let finalPixels = valuePixels;

    for (let round = 0; round < rounds; round += 1) {
      runFullscreenPass({
        runtime,
        programKey: WEBGL2_PROGRAM_KEY.ConstrainedSmooth,
        width,
        framebuffer,
        uniforms: [
          { name: "uGridCount", type: "int", value: width },
          { name: "uSoftObsMaxDelta", type: "float", value: softObsMaxDelta }
        ],
        textures: [
          { texture: currentValueTexture, unit: 0, uniformName: "uValueTex" },
          { texture: originalTexture, unit: 1, uniformName: "uOriginalTex" },
          { texture: maskTexture, unit: 2, uniformName: "uMaskTex" },
          { texture: neighborTextureA, unit: 3, uniformName: "uNeighborTexA" },
          { texture: neighborTextureB, unit: 4, uniformName: "uNeighborTexB" }
        ]
      });

      finalPixels = readFramebuffer(runtime, width);
      currentValueTexture = nextValueTexture;
      useValueAAsCurrent = !useValueAAsCurrent;
      nextValueTexture = getOrCreateScratchTexture({
        runtime,
        key: useValueAAsCurrent ? valueBKey : valueAKey,
        width,
        pixels: finalPixels
      });
      framebuffer = attachFramebufferTexture({
        runtime,
        texture: nextValueTexture
      });
    }

    return extractChannel(finalPixels, 0);
  } catch (error) {
    invalidateWebGl2Runtime();
    throw error;
  }
}

function extractChannel(pixels: Float32Array, channel: number) {
  const result = new Float32Array(pixels.length / 4);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = pixels[index * 4 + channel];
  }
  return result;
}
