export const WEBGL2_PROGRAM_KEY = {
  ContinuousPropagate: "continuousPropagate",
  ConstrainedSmooth: "constrainedSmooth"
} as const;

export type WebGl2ProgramKey =
  (typeof WEBGL2_PROGRAM_KEY)[keyof typeof WEBGL2_PROGRAM_KEY];

export const WEBGL2_VERTEX_SHADER_SOURCE = `#version 300 es
precision highp float;
void main() {
  vec2 positions[3] = vec2[3](
    vec2(-1.0, -1.0),
    vec2(3.0, -1.0),
    vec2(-1.0, 3.0)
  );
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}`;

export const WEBGL2_PROGRAM_DEFINITIONS: Record<
  WebGl2ProgramKey,
  {
    fragmentSource: string;
    uniformNames: string[];
  }
> = {
  [WEBGL2_PROGRAM_KEY.ContinuousPropagate]: {
    uniformNames: [
      "uStateTex",
      "uMaskTex",
      "uNeighborTexA",
      "uNeighborTexB",
      "uGridCount"
    ],
    fragmentSource: `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uStateTex;
uniform sampler2D uMaskTex;
uniform sampler2D uNeighborTexA;
uniform sampler2D uNeighborTexB;
uniform int uGridCount;

out vec4 outColor;

float lowerMedian(float values[8], int count) {
  for (int i = 1; i < 8; i += 1) {
    if (i >= count) {
      break;
    }

    float current = values[i];
    int j = i - 1;
    while (j >= 0 && values[j] > current) {
      values[j + 1] = values[j];
      j -= 1;
    }
    values[j + 1] = current;
  }

  return values[(count - 1) / 2];
}

void main() {
  int gridId = int(floor(gl_FragCoord.x));
  if (gridId < 0 || gridId >= uGridCount) {
    outColor = vec4(0.0);
    return;
  }

  vec4 state = texelFetch(uStateTex, ivec2(gridId, 0), 0);
  vec4 mask = texelFetch(uMaskTex, ivec2(gridId, 0), 0);

  if (mask.r < 0.5 || state.g >= 0.5) {
    outColor = vec4(state.r, state.g, 0.0, 1.0);
    return;
  }

  float ordinary[8];
  float anchor[8];
  int ordinaryCount = 0;
  int anchorCount = 0;

  for (int i = 0; i < 8; i += 1) {
    vec4 texel = i < 4
      ? texelFetch(uNeighborTexA, ivec2(gridId, 0), 0)
      : texelFetch(uNeighborTexB, ivec2(gridId, 0), 0);
    int neighborId = int(i < 4 ? texel[i] : texel[i - 4]);
    if (neighborId < 0 || neighborId >= uGridCount) {
      continue;
    }

    vec4 neighborState = texelFetch(uStateTex, ivec2(neighborId, 0), 0);
    if (neighborState.g < 0.5) {
      continue;
    }

    vec4 neighborMask = texelFetch(uMaskTex, ivec2(neighborId, 0), 0);
    if (neighborMask.g >= 0.5) {
      anchor[anchorCount] = neighborState.r;
      anchorCount += 1;
    } else {
      ordinary[ordinaryCount] = neighborState.r;
      ordinaryCount += 1;
    }
  }

  if (ordinaryCount > 0) {
    outColor = vec4(lowerMedian(ordinary, ordinaryCount), 1.0, 1.0, 1.0);
    return;
  }

  if (anchorCount > 0) {
    outColor = vec4(lowerMedian(anchor, anchorCount), 1.0, 1.0, 1.0);
    return;
  }

  outColor = vec4(state.r, state.g, 0.0, 1.0);
}`
  },
  [WEBGL2_PROGRAM_KEY.ConstrainedSmooth]: {
    uniformNames: [
      "uValueTex",
      "uOriginalTex",
      "uMaskTex",
      "uNeighborTexA",
      "uNeighborTexB",
      "uGridCount",
      "uSoftObsMaxDelta"
    ],
    fragmentSource: `#version 300 es
precision highp float;
precision highp sampler2D;

uniform sampler2D uValueTex;
uniform sampler2D uOriginalTex;
uniform sampler2D uMaskTex;
uniform sampler2D uNeighborTexA;
uniform sampler2D uNeighborTexB;
uniform int uGridCount;
uniform float uSoftObsMaxDelta;

out vec4 outColor;

float clampRange(float value, float minValue, float maxValue) {
  return max(minValue, min(maxValue, value));
}

void main() {
  int gridId = int(floor(gl_FragCoord.x));
  if (gridId < 0 || gridId >= uGridCount) {
    outColor = vec4(0.0);
    return;
  }

  vec4 mask = texelFetch(uMaskTex, ivec2(gridId, 0), 0);
  float current = texelFetch(uValueTex, ivec2(gridId, 0), 0).r;

  if (mask.r < 0.5 || mask.g >= 0.5) {
    outColor = vec4(current, 0.0, 0.0, 1.0);
    return;
  }

  float sum = current;
  float count = 1.0;
  for (int i = 0; i < 8; i += 1) {
    vec4 texel = i < 4
      ? texelFetch(uNeighborTexA, ivec2(gridId, 0), 0)
      : texelFetch(uNeighborTexB, ivec2(gridId, 0), 0);
    int neighborId = int(i < 4 ? texel[i] : texel[i - 4]);
    if (neighborId < 0 || neighborId >= uGridCount) {
      continue;
    }

    vec4 neighborMask = texelFetch(uMaskTex, ivec2(neighborId, 0), 0);
    if (neighborMask.r < 0.5) {
      continue;
    }

    sum += texelFetch(uValueTex, ivec2(neighborId, 0), 0).r;
    count += 1.0;
  }

  float average = sum / count;
  if (mask.b >= 0.5) {
    float originalValue = texelFetch(uOriginalTex, ivec2(gridId, 0), 0).r;
    outColor = vec4(
      clampRange(average, originalValue, originalValue + uSoftObsMaxDelta),
      0.0,
      0.0,
      1.0
    );
    return;
  }

  outColor = vec4(average, 0.0, 0.0, 1.0);
}`
  }
};
