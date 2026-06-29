import { describe, expect, it } from "vitest";

import { fitCanvasToStage } from "../../../browser/fit-canvas-to-stage.js";

describe("fitCanvasToStage", () => {
  it("会按比例缩小超出容器的画布", () => {
    expect(
      fitCanvasToStage({
        canvasWidth: 1200,
        canvasHeight: 800,
        stageWidth: 600,
        stageHeight: 400,
        padding: 0
      })
    ).toEqual({
      width: 600,
      height: 400
    });
  });

  it("会保持高图完整显示", () => {
    expect(
      fitCanvasToStage({
        canvasWidth: 500,
        canvasHeight: 1000,
        stageWidth: 400,
        stageHeight: 300,
        padding: 0
      })
    ).toEqual({
      width: 150,
      height: 300
    });
  });

  it("不会把本来更小的画布放大", () => {
    expect(
      fitCanvasToStage({
        canvasWidth: 300,
        canvasHeight: 200,
        stageWidth: 1000,
        stageHeight: 800,
        padding: 32
      })
    ).toEqual({
      width: 300,
      height: 200
    });
  });
});
