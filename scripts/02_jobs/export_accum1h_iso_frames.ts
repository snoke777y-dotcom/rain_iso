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
  const realtime1hPath = args["realtime-1h"] ?? "datas/01_raw/realtime_1h_response.json.txt";
  const assetDirectory =
    args["asset-dir"] ?? "datas/03_dictionary/rain_iso/bj_1000m_union_assets";
  const chartsDir =
    args["charts-dir"] ?? "uploads/02_charts/rain_iso_accum1h_2025-07-23";
  const exportsDir =
    args["exports-dir"] ?? "uploads/03_exports/rain_iso_accum1h_2025-07-23";

  await Promise.all([
    mkdir(chartsDir, { recursive: true }),
    mkdir(exportsDir, { recursive: true })
  ]);

  const [rawResponse, assets] = await Promise.all([
    readRawRainApiResponse(realtime1hPath),
    loadRainIsoAssets({
      assetDirectory
    })
  ]);

  validateRawRainApiResponse(rawResponse, {
    expectedProductType: FrameType.Accum1hStep
  });

  const accumSequence = buildRainIsoSequenceFromApiResponse(rawResponse, {
    productType: FrameType.Accum1hStep
  });
  const frames = buildDirectFrames(accumSequence);
  const summary = [];

  for (const frame of frames) {
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

    await writeFile(bmpPath, bmp);
    summary.push({
      frameKey: frame.frameKey,
      frameTime: frame.frameTime,
      maxValue: frameResult.summary.maxValue,
      renderableGridCount: frameResult.summary.renderableGridCount,
      hardAnchorCount: frameResult.summary.hardAnchorCount,
      softObsCount: frameResult.summary.softObsCount,
      ordinaryOnlyMode: frameResult.summary.ordinaryOnlyMode,
      bmpPath: resolve(bmpPath)
    });
  }

  const summaryPath = join(exportsDir, "summary.json");
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        sourcePath: resolve(realtime1hPath),
        assetDirectory: resolve(assetDirectory),
        frameCount: summary.length,
        frames: summary
      },
      null,
      2
    ) + "\n",
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        frameCount: summary.length,
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
