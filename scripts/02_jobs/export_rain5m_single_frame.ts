import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { FrameType } from "../../app/domain/rain_iso/models.js";
import { runFrameOnCpu } from "../../app/application/rain_iso/use-cases/run-frame-on-cpu.js";
import { buildDirectFrames } from "../../app/application/rain_iso/series/build-5m-frames.js";
import { renderGridLayer } from "../../app/interfaces/rain_iso/render/render-grid-layer.js";
import { encodeRenderedBmp } from "../../app/interfaces/rain_iso/render/rendered-to-bmp.js";
import { loadRainIsoAssets } from "../../app/infrastructure/rain_iso/assets/asset-loader.js";
import {
  buildRainIsoSequenceFromApiResponse,
  type RawRainApiResponse
} from "../../app/infrastructure/rain_iso/package/raw-api-adapter.js";
import { validateRawRainApiResponse } from "../../app/infrastructure/rain_iso/package/package-validator.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const realtime5mPath = args["realtime-5m"] ?? "datas/01_raw/realtime_5m_response.txt";
  const assetDirectory =
    args["asset-dir"] ?? "datas/03_dictionary/rain_iso/bj_1000m_union_assets";
  const frameTime = args["frame-time"] ?? "2025-07-23T10:25:00+08:00";
  const chartsDir =
    args["charts-dir"] ?? "uploads/02_charts/rain_iso_rain5m_single_2025-07-23";
  const exportsDir =
    args["exports-dir"] ?? "uploads/03_exports/rain_iso_rain5m_single_2025-07-23";

  await Promise.all([
    mkdir(chartsDir, { recursive: true }),
    mkdir(exportsDir, { recursive: true })
  ]);

  const [rawResponse, assets] = await Promise.all([
    readRawRainApiResponse(realtime5mPath),
    loadRainIsoAssets({
      assetDirectory
    })
  ]);

  validateRawRainApiResponse(rawResponse, {
    expectedProductType: FrameType.Rain5m
  });

  const rain5mSequence = buildRainIsoSequenceFromApiResponse(rawResponse, {
    productType: FrameType.Rain5m
  });
  const frame = buildDirectFrames(rain5mSequence).find((candidate) => candidate.frameTime === frameTime);
  if (!frame) {
    throw new Error(`未找到时次 ${frameTime}`);
  }

  const frameResult = runFrameOnCpu(frame, {
    assets,
    selectedBackend: "cpu"
  });
  const rendered = renderGridLayer({
    frameResult,
    gridMeta: assets.gridMeta,
    renderBoundary: assets.renderBoundary,
    gridResolutionM: assets.manifest.grid_resolution_m
  });
  const bmp = encodeRenderedBmp(rendered);
  const stamp = frame.frameTime.replace(/[:+]/g, "-");
  const bmpPath = join(chartsDir, `${frame.frameType}_${stamp}.bmp`);
  const summaryPath = join(exportsDir, "summary.json");

  await Promise.all([
    writeFile(bmpPath, bmp),
    writeFile(
      summaryPath,
      JSON.stringify(
        {
          sourcePath: resolve(realtime5mPath),
          assetDirectory: resolve(assetDirectory),
          frameKey: frame.frameKey,
          frameTime: frame.frameTime,
          maxValue: frameResult.summary.maxValue,
          renderableGridCount: frameResult.summary.renderableGridCount,
          hardAnchorCount: frameResult.summary.hardAnchorCount,
          softObsCount: frameResult.summary.softObsCount,
          ordinaryOnlyMode: frameResult.summary.ordinaryOnlyMode,
          bmpPath: resolve(bmpPath)
        },
        null,
        2
      ) + "\n",
      "utf8"
    )
  ]);

  console.log(
    JSON.stringify(
      {
        frameKey: frame.frameKey,
        chartsDir: resolve(chartsDir),
        summaryPath: resolve(summaryPath)
      },
      null,
      2
    )
  );
}

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      continue;
    }

    args[key] = value;
    index += 1;
  }
  return args;
}

async function readRawRainApiResponse(filePath: string): Promise<RawRainApiResponse> {
  return JSON.parse(await readFile(filePath, "utf8")) as RawRainApiResponse;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
