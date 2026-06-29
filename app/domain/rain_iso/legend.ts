import {
  LEGEND_5M_BIN_COUNT,
  LEGEND_ACCUM_24H_BIN_COUNT,
  RENDER_THRESHOLD_MM
} from "./constants.js";
import {
  FrameType,
  LegendId,
  type LegendBin,
  type RainIsoLegend
} from "./models.js";

const LEGEND_5M_V1: RainIsoLegend = {
  legendId: LegendId.Legend5mV1,
  productType: FrameType.Rain5m,
  bins: [
    createLegendBin(0.1, 0.4, "#97F297", "#333333"),
    createLegendBin(0.4, 1.0, "#3DCE3D", "#333333"),
    createLegendBin(1.0, 2.0, "#6ACEF2", "#333333"),
    createLegendBin(2.0, 5.0, "#1010F2", "#ffffff"),
    createLegendBin(5.0, 10.0, "#F210F2", "#ffffff"),
    createLegendBin(10.0, 15.0, "#A0103D", "#ffffff"),
    createLegendBin(15.0, 20.0, "#f8aa0a", "#ffffff"),
    createLegendBin(20.0, null, "#9933FF", "#ffffff")
  ]
};

const LEGEND_ACCUM_24H_V1: RainIsoLegend = {
  legendId: LegendId.LegendAccum24hV1,
  productType: FrameType.Accum1hStep,
  bins: [
    createLegendBin(0.1, 10.0, "#97F297", "#333333"),
    createLegendBin(10.0, 25.0, "#3DCE3D", "#333333"),
    createLegendBin(25.0, 50.0, "#6ACEF2", "#333333"),
    createLegendBin(50.0, 100.0, "#1010F2", "#ffffff"),
    createLegendBin(100.0, 250.0, "#A0103D", "#ffffff"),
    createLegendBin(250.0, 400.0, "#f8aa0a", "#ffffff"),
    createLegendBin(400.0, null, "#9933FF", "#ffffff")
  ]
};

const legendsById: Record<LegendId, RainIsoLegend> = {
  [LegendId.Legend5mV1]: LEGEND_5M_V1,
  [LegendId.LegendAccum24hV1]: LEGEND_ACCUM_24H_V1
};

const legendsByFrameType: Record<FrameType, RainIsoLegend> = {
  [FrameType.Rain5m]: LEGEND_5M_V1,
  [FrameType.Accum1hStep]: LEGEND_ACCUM_24H_V1
};

assertLegendCount(LEGEND_5M_V1, LEGEND_5M_BIN_COUNT);
assertLegendCount(LEGEND_ACCUM_24H_V1, LEGEND_ACCUM_24H_BIN_COUNT);

export function getLegendById(legendId: LegendId): RainIsoLegend {
  return legendsById[legendId];
}

export function getLegendByFrameType(frameType: FrameType): RainIsoLegend {
  return legendsByFrameType[frameType];
}

export function resolveLegendBin(
  legend: RainIsoLegend,
  value: number
): LegendBin | null {
  if (!Number.isFinite(value) || value < RENDER_THRESHOLD_MM) {
    return null;
  }

  for (const bin of legend.bins) {
    const inOpenEndedRange = bin.max === null && value >= bin.min;
    const inClosedOpenRange =
      bin.max !== null && value >= bin.min && value < bin.max;

    if (inOpenEndedRange || inClosedOpenRange) {
      return bin;
    }
  }

  return null;
}

function createLegendBin(
  min: number,
  max: number | null,
  color: string,
  textColor: string
): LegendBin {
  return {
    min,
    max,
    color,
    textColor,
    label: max === null ? `${min}+` : `${min}~${max}`
  };
}

function assertLegendCount(legend: RainIsoLegend, expectedCount: number): void {
  if (legend.bins.length !== expectedCount) {
    throw new Error(
      `Legend ${legend.legendId} bin count mismatch: expected ${expectedCount}, got ${legend.bins.length}`
    );
  }
}
