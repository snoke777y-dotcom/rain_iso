import { describe, expect, it } from "vitest";

import { FrameType, LegendId, type FrameResult } from "../../../app/domain/rain_iso/models.js";
import { buildColorRamp } from "../../../app/interfaces/rain_iso/render/build-color-ramp.js";
import { renderGridLayer } from "../../../app/interfaces/rain_iso/render/render-grid-layer.js";
import { createFrameViewModel } from "../../../app/interfaces/rain_iso/render/frame-view-model.js";

describe("render grid layer", () => {
  it("非雨区透明，雨区按固定图例着色，并支持网格值查询", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      values: [25, 5, 0, 1.2],
      rainMask: [1, 1, 0, 1]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createGridMeta()
    });

    expect(rendered.width).toBe(2);
    expect(rendered.height).toBe(2);
    expect(Array.from(rendered.getPixel(0))).toEqual([153, 51, 255, 255]);
    expect(Array.from(rendered.getPixel(2))).toEqual([0, 0, 0, 0]);
    expect(rendered.queryGridValue(1, 1)).toBeCloseTo(1.2, 5);
  });

  it("支持按时间顺序切换帧，并对不同产品使用固定图例", () => {
    const rainFrame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      frameTime: "2026-06-24T13:55:00+08:00",
      values: [25, 5, 0, 1.2],
      rainMask: [1, 1, 0, 1]
    });
    const accumFrame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      frameTime: "2026-06-24T14:00:00+08:00",
      values: [120, 12, 0, 0.5],
      rainMask: [1, 1, 0, 1]
    });

    const viewModel = createFrameViewModel({
      frames: [accumFrame, rainFrame],
      gridMeta: createGridMeta()
    });

    expect(viewModel.frameKeys).toEqual([
      "rain_5m|2026-06-24T13:55:00+08:00",
      "accum_1h_step|2026-06-24T14:00:00+08:00"
    ]);
    expect(viewModel.currentFrame?.frameKey).toBe(
      "rain_5m|2026-06-24T13:55:00+08:00"
    );

    const switched = viewModel.selectFrame(
      "accum_1h_step|2026-06-24T14:00:00+08:00"
    );
    expect(switched.frame.frameType).toBe(FrameType.Accum1hStep);
    expect(Array.from(switched.rendered.getPixel(0))).toEqual([160, 16, 61, 255]);

    const rainRamp = buildColorRamp(FrameType.Rain5m);
    const accumRamp = buildColorRamp(FrameType.Accum1hStep);
    expect(rainRamp[rainRamp.length - 1].color).toBe("#9933FF");
    expect(accumRamp[4].color).toBe("#A0103D");
  });

  it("开启超采样时扩大高值影响范围，减轻台阶感", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [120, 0, 0, 0],
      rainMask: [1, 1, 1, 1],
      hardAnchorMask: [0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createGridMeta(),
      pixelScale: 4
    });

    expect(rendered.width).toBe(5);
    expect(rendered.height).toBe(5);
    expect(Array.from(rendered.getPixel(0))).toEqual([160, 16, 61, 255]);
    expect(readPixel(rendered, 0, 2)).toEqual([160, 16, 61, 255]);
  });

  it("低量级边缘允许降档插值过渡，减轻网格锯齿", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:00:00+08:00",
      values: [1.2, 0],
      rainMask: [1, 0],
      hardAnchorMask: [0, 0],
      softObsMask: [0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(2),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(0))).toEqual(readPixel(rendered, 0, 1));
    expect(readPixel(rendered, 0, 2)).toEqual([61, 206, 61, 255]);
  });

  it("局部更高一档的低量级颜色不会被周边更低档平均掉", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:02:00+08:00",
      values: [1.2, 0.5],
      rainMask: [1, 1],
      hardAnchorMask: [0, 0],
      softObsMask: [0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(2),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 2)).toEqual([106, 206, 242, 255]);
  });

  it("低量级加强版平滑允许向外再羽化一格中心", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:05:00+08:00",
      values: [1.2, 0, 0],
      rainMask: [1, 0, 0],
      hardAnchorMask: [0, 0, 0],
      softObsMask: [0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(3),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("最低两档的孤立小斑块会在渲染层被压掉", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:06:00+08:00",
      values: [0, 0, 0, 0, 0.5, 0, 0, 0, 0],
      rainMask: [0, 0, 0, 0, 1, 0, 0, 0, 0],
      hardAnchorMask: [0, 0, 0, 0, 0, 0, 0, 0, 0],
      softObsMask: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(3, 3),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(4))).toEqual([0, 0, 0, 0]);
  });

  it("默认双倍超采样下，孤立蓝色单格在格外生成一圈降档过渡，但不点亮相邻空格中心", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:06:30+08:00",
      values: [
        0, 0, 0,
        0, 3, 0,
        0, 0, 0
      ],
      rainMask: [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0
      ],
      hardAnchorMask: [
        0, 0, 0,
        0, 1, 0,
        0, 0, 0
      ],
      softObsMask: new Array(9).fill(0)
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(3, 3),
      pixelScale: 2
    });

    expect(readPixel(rendered, 2, 1)).toEqual([106, 206, 242, 255]);
    expect(Array.from(rendered.getPixel(3))).toEqual([0, 0, 0, 0]);
  });

  it("两格连通的小蓝斑块只在外侧补递减过渡，不改内部连片颜色", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:06:45+08:00",
      values: [0, 3, 3, 0],
      rainMask: [0, 1, 1, 0],
      hardAnchorMask: [0, 1, 1, 0],
      softObsMask: [0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(4),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 6)).toEqual([16, 16, 242, 255]);
    expect(readPixel(rendered, 0, 2)).toEqual([106, 206, 242, 255]);
    expect(Array.from(rendered.getPixel(0))).toEqual([0, 0, 0, 0]);
  });

  it("超采样时不再把被高量级轮廓包住的低档格中心硬钉出来", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:07:00+08:00",
      values: [
        0, 0, 0,
        0, 1.2, 3,
        0, 0, 0
      ],
      rainMask: [
        0, 0, 0,
        0, 1, 1,
        0, 0, 0
      ],
      hardAnchorMask: new Array(9).fill(0),
      softObsMask: new Array(9).fill(0)
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(3, 3),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(4))).toEqual([16, 16, 242, 255]);
  });

  it("超采样时高量级边界外接的低档尾巴中心也不再形成串状针眼", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:07:30+08:00",
      values: [
        0, 3, 3, 0, 0,
        1.2, 3, 3, 0, 0,
        1.2, 1.2, 3, 0, 0,
        0, 1.2, 1.2, 0, 0,
        0, 0, 1.2, 1.2, 0
      ],
      rainMask: [
        0, 1, 1, 0, 0,
        1, 1, 1, 0, 0,
        1, 1, 1, 0, 0,
        0, 1, 1, 0, 0,
        0, 0, 1, 1, 0
      ],
      hardAnchorMask: new Array(25).fill(0),
      softObsMask: new Array(25).fill(0)
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(5, 5),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(22))).toEqual(readPixel(rendered, 16, 9));
    expect(Array.from(rendered.getPixel(23))).toEqual(readPixel(rendered, 16, 13));
  });

  it("同档小蓝块外侧的整格中心也不再保留成点状蓝格", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T14:07:45+08:00",
      values: [
        1.2, 1.2, 1.2, 1.2, 1.2,
        1.2, 1.2, 3.0, 1.2, 1.2,
        1.2, 3.0, 3.0, 3.0, 1.2,
        1.2, 1.2, 3.0, 1.2, 1.2,
        1.2, 1.2, 1.2, 1.2, 1.2
      ],
      rainMask: new Array(25).fill(1),
      hardAnchorMask: new Array(25).fill(0),
      softObsMask: new Array(25).fill(0)
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(5, 5),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(7))).toEqual(readPixel(rendered, 4, 9));
    expect(Array.from(rendered.getPixel(11))).toEqual(readPixel(rendered, 8, 5));
    expect(Array.from(rendered.getPixel(13))).toEqual(readPixel(rendered, 8, 13));
    expect(Array.from(rendered.getPixel(17))).toEqual(readPixel(rendered, 12, 9));
  });

  it("原始绝对高量级中心点在有同档支撑时也不再保留成点状高值", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:07:50+08:00",
      values: [
        60, 60, 60, 60, 60,
        60, 120, 120, 60, 60,
        60, 60, 60, 60, 60,
        60, 60, 60, 60, 60,
        60, 60, 60, 60, 60
      ],
      rainMask: new Array(25).fill(1),
      hardAnchorMask: new Array(25).fill(0),
      softObsMask: new Array(25).fill(0)
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(5, 5),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(6))).toEqual(readPixel(rendered, 4, 5));
    expect(Array.from(rendered.getPixel(7))).toEqual(readPixel(rendered, 4, 9));
  });

  it("超采样合并时保留硬锚点峰值，不被周边低值压低", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [120, 0, 0, 0],
      rainMask: [1, 1, 1, 1],
      hardAnchorMask: [1, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createGridMeta(),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 1)).toEqual([160, 16, 61, 255]);
  });

  it("超采样合并时保留局部窗口内最大量级，不限于硬锚点", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [120, 0, 0, 0],
      rainMask: [1, 1, 1, 1],
      hardAnchorMask: [0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createGridMeta(),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 1)).toEqual([160, 16, 61, 255]);
  });

  it("桥接局部最高档位的直线断点，支持间隔 2 格", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [120, 0, 0, 120],
      rainMask: [1, 1, 1, 1],
      hardAnchorMask: [0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(4),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 4)).toEqual([160, 16, 61, 255]);
    expect(readPixel(rendered, 0, 8)).toEqual([160, 16, 61, 255]);
  });

  it("桥接局部最高档位的对角断点", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [120, 0, 0, 0, 0, 0, 0, 0, 120],
      rainMask: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      hardAnchorMask: [0, 0, 0, 0, 0, 0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(3, 3),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(4))).toEqual([160, 16, 61, 255]);
  });

  it("附近存在更高档位时，不桥接较低档位", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [30, 120, 0, 30],
      rainMask: [1, 1, 1, 1],
      hardAnchorMask: [0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(4),
      pixelScale: 4
    });

    expect(readPixel(rendered, 0, 8)).toEqual([0, 0, 0, 0]);
  });

  it("局部最高档位可压过中间较低档，桥接错位断裂", () => {
    const frame = createFrameResult({
      frameType: FrameType.Accum1hStep,
      frameKey: "accum_1h_step|2026-06-24T14:00:00+08:00",
      values: [120, 20, 20, 30, 20, 120],
      rainMask: [1, 1, 1, 1, 1, 1],
      hardAnchorMask: [0, 0, 0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createSquareGridMeta(3, 2),
      pixelScale: 4
    });

    expect(Array.from(rendered.getPixel(3))).toEqual([160, 16, 61, 255]);
  });

  it("可在渲染结果上叠加当前地图边界线", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T13:55:00+08:00",
      values: [0, 0, 0, 0],
      rainMask: [0, 0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createGridMeta(),
      renderBoundary: createSquareBoundary(),
      gridResolutionM: 1000
    });

    expect(readPixel(rendered, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(readPixel(rendered, 0, 1)).toEqual([0, 0, 0, 255]);
    expect(readPixel(rendered, 1, 0)).toEqual([0, 0, 0, 255]);
  });

  it("存在北京市界时，不再按边界裁剪网格", () => {
    const frame = createFrameResult({
      frameType: FrameType.Rain5m,
      frameKey: "rain_5m|2026-06-24T13:56:00+08:00",
      values: [1.2, 1.2, 1.2],
      rainMask: [1, 1, 1],
      hardAnchorMask: [0, 0, 0],
      softObsMask: [0, 0, 0]
    });

    const rendered = renderGridLayer({
      frameResult: frame,
      gridMeta: createLineGridMeta(3),
      renderBoundary: createBeijingAndOutsideBoundary(),
      gridResolutionM: 1000
    });

    expect(Array.from(rendered.getPixel(0))).toEqual([106, 206, 242, 255]);
    expect(Array.from(rendered.getPixel(2))).toEqual([106, 206, 242, 255]);
  });
});

function createGridMeta() {
  return {
    gridId: new Int32Array([0, 1, 2, 3]),
    row: new Int32Array([0, 0, 1, 1]),
    col: new Int32Array([0, 1, 0, 1]),
    centerX: new Float32Array([0, 1000, 0, 1000]),
    centerY: new Float32Array([0, 0, 1000, 1000])
  };
}

function createLineGridMeta(cols: number) {
  return createSquareGridMeta(1, cols);
}

function createSquareGridMeta(rows: number, cols: number) {
  const gridCount = rows * cols;
  const gridId = new Int32Array(gridCount);
  const row = new Int32Array(gridCount);
  const col = new Int32Array(gridCount);
  const centerX = new Float32Array(gridCount);
  const centerY = new Float32Array(gridCount);

  for (let gridIndex = 0; gridIndex < gridCount; gridIndex += 1) {
    const currentRow = Math.floor(gridIndex / cols);
    const currentCol = gridIndex % cols;
    gridId[gridIndex] = gridIndex;
    row[gridIndex] = currentRow;
    col[gridIndex] = currentCol;
    centerX[gridIndex] = currentCol * 1000;
    centerY[gridIndex] = currentRow * 1000;
  }

  return {
    gridId,
    row,
    col,
    centerX,
    centerY
  };
}

function createFrameResult(input: {
  frameType: FrameType;
  frameKey: string;
  frameTime?: string;
  values: number[];
  rainMask: number[];
  hardAnchorMask?: number[];
  softObsMask?: number[];
}): FrameResult {
  return {
    frameKey: input.frameKey,
    frameType: input.frameType,
    frameTime: input.frameTime ?? "2026-06-24T13:55:00+08:00",
    selectedBackend: "cpu" as const,
    legendId:
      input.frameType === FrameType.Rain5m
        ? LegendId.Legend5mV1
        : LegendId.LegendAccum24hV1,
    valueGrid: new Float32Array(input.values),
    rainMask: new Uint8Array(input.rainMask),
    hardAnchorMask: new Uint8Array(input.hardAnchorMask ?? [1, 0, 0, 0]),
    softObsMask: new Uint8Array(input.softObsMask ?? [0, 1, 0, 1]),
    summary: {
      maxValue: Math.max(...input.values),
      renderableGridCount: input.rainMask.filter((value) => value === 1).length,
      hardAnchorCount: 1,
      softObsCount: 2,
      suspectStationCount: 0,
      ordinaryOnlyMode: false
    }
  };
}

function readPixel(
  rendered: { width: number; pixels: Uint8ClampedArray },
  row: number,
  col: number
) {
  const offset = (row * rendered.width + col) * 4;
  return Array.from(rendered.pixels.slice(offset, offset + 4));
}

function createSquareBoundary() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [[
            [0, 0],
            [0.008983152841195214, 0],
            [0.008983152841195214, 0.008983152804391995],
            [0, 0.008983152804391995],
            [0, 0]
          ]]
        }
      }
    ]
  };
}

function createBeijingAndOutsideBoundary() {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          xzqhdm: "110000",
          xzqmc: "北京市"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            projectedToLonLat(-500, -500),
            projectedToLonLat(500, -500),
            projectedToLonLat(500, 500),
            projectedToLonLat(-500, 500),
            projectedToLonLat(-500, -500)
          ]]
        }
      },
      {
        type: "Feature",
        properties: {
          adcode: 130000,
          name: "境外"
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            projectedToLonLat(500, -500),
            projectedToLonLat(1500, -500),
            projectedToLonLat(1500, 500),
            projectedToLonLat(500, 500),
            projectedToLonLat(500, -500)
          ]]
        }
      }
    ]
  };
}

function projectedToLonLat(x: number, y: number) {
  const lon = (x / 20037508.34) * 180;
  const lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((y / 20037508.34) * Math.PI)) - Math.PI / 2);
  return [lon, lat];
}
