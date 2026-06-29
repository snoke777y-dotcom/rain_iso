export const FrameType = {
  Rain5m: "rain_5m",
  Accum1hStep: "accum_1h_step"
} as const;

export type FrameType = (typeof FrameType)[keyof typeof FrameType];

export const BackendKind = {
  Auto: "auto",
  WebGpu: "webgpu",
  WebGl2: "webgl2",
  Cpu: "cpu"
} as const;

export type BackendKind = (typeof BackendKind)[keyof typeof BackendKind];

export const LegendId = {
  Legend5mV1: "legend_5m_v1",
  LegendAccum24hV1: "legend_accum_24h_v1"
} as const;

export type LegendId = (typeof LegendId)[keyof typeof LegendId];

export type GridValueArray = Float32Array;
export type GridMaskArray = Uint8Array;

export type FrameSummary = {
  maxValue: number;
  renderableGridCount: number;
  hardAnchorCount: number;
  softObsCount: number;
  suspectStationCount: number;
  ordinaryOnlyMode: boolean;
  minRenderableValue?: number;
  meanRenderableValue?: number;
  elapsedMs?: number;
};

export type FrameResult = {
  frameKey: string;
  frameType: FrameType;
  frameTime: string;
  selectedBackend: Exclude<BackendKind, "auto">;
  legendId: LegendId;
  valueGrid: GridValueArray;
  rainMask: GridMaskArray;
  hardAnchorMask: GridMaskArray;
  softObsMask: GridMaskArray;
  knownMask?: GridMaskArray;
  summary: FrameSummary;
};

export type LegendBin = {
  min: number;
  max: number | null;
  color: string;
  textColor: string;
  label: string;
};

export type RainIsoLegend = {
  legendId: LegendId;
  productType: FrameType;
  bins: LegendBin[];
};
