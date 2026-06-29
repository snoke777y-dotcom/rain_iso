import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { runFrameOnCpu } from "../../../app/application/rain_iso/use-cases/run-frame-on-cpu.js";
import { buildDirectFrames } from "../../../app/application/rain_iso/series/build-5m-frames.js";
import { loadRainIsoAssets } from "../../../app/infrastructure/rain_iso/assets/asset-loader.js";
import { buildRainIsoSequenceFromApiResponse } from "../../../app/infrastructure/rain_iso/package/raw-api-adapter.js";
import { validateRawRainApiResponse } from "../../../app/infrastructure/rain_iso/package/package-validator.js";
import { renderGridLayer } from "../../../app/interfaces/rain_iso/render/render-grid-layer.js";

describe("rain5m rainy centers", () => {
  it("2026-06-19T12:55:00+08:00 不应留下可见的空心格点", async () => {
    const rawResponse = JSON.parse(
      await readFile("datas/01_raw/realtime_5m_response.json", "utf8")
    );
    validateRawRainApiResponse(rawResponse, {
      expectedProductType: FrameType.Rain5m
    });

    const assets = await loadRainIsoAssets({
      assetDirectory: "datas/03_dictionary/rain_iso/bj_1000m_union_assets"
    });
    const frame = buildDirectFrames(
      buildRainIsoSequenceFromApiResponse(rawResponse, {
        productType: FrameType.Rain5m
      })
    ).find((candidate) => candidate.frameTime === "2026-06-19T12:55:00+08:00");
    if (!frame) {
      throw new Error("未找到 2026-06-19T12:55:00+08:00");
    }

    const frameResult = await runFrameOnCpu(frame, {
      assets,
      selectedBackend: "cpu"
    });
    const rendered = renderGridLayer({
      frameResult,
      gridMeta: assets.gridMeta,
      renderBoundary: assets.renderBoundary,
      gridResolutionM: assets.manifest.grid_resolution_m,
      pixelScale: 4
    });

    let hollowCenterCount = 0;
    for (let gridIndex = 0; gridIndex < assets.gridMeta.gridId.length; gridIndex += 1) {
      const row = assets.gridMeta.row[gridIndex] * 4;
      const col = assets.gridMeta.col[gridIndex] * 4;
      const centerOffset = (row * rendered.width + col) * 4;
      if (rendered.pixels[centerOffset + 3] !== 0) {
        continue;
      }

      let visibleNeighborCount = 0;
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          if (rowOffset === 0 && colOffset === 0) {
            continue;
          }

          const neighborRow = row + rowOffset;
          const neighborCol = col + colOffset;
          if (
            neighborRow < 0 ||
            neighborCol < 0 ||
            neighborRow >= rendered.height ||
            neighborCol >= rendered.width
          ) {
            continue;
          }

          const neighborOffset = (neighborRow * rendered.width + neighborCol) * 4;
          if (rendered.pixels[neighborOffset + 3] === 0) {
            continue;
          }
          if (
            rendered.pixels[neighborOffset] === 0 &&
            rendered.pixels[neighborOffset + 1] === 0 &&
            rendered.pixels[neighborOffset + 2] === 0
          ) {
            continue;
          }

          visibleNeighborCount += 1;
        }
      }

      if (visibleNeighborCount >= 2) {
        hollowCenterCount += 1;
      }
    }

    expect(hollowCenterCount).toBe(0);
  }, 30000);
});
