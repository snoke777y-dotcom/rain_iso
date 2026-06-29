import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { FrameType } from "../../app/domain/rain_iso/models.js";
import { runFrameOnCpu } from "../../app/application/rain_iso/use-cases/run-frame-on-cpu.js";
import { buildDirectFrames } from "../../app/application/rain_iso/series/build-5m-frames.js";
import { renderGridLayer } from "../../app/interfaces/rain_iso/render/render-grid-layer.js";
import { encodeRenderedBmp } from "../../app/interfaces/rain_iso/render/rendered-to-bmp.js";
import { loadRainIsoAssets } from "../../app/infrastructure/rain_iso/assets/asset-loader.js";
import { buildRainIsoSequenceFromApiResponse } from "../../app/infrastructure/rain_iso/package/raw-api-adapter.js";
import { validateRawRainApiResponse } from "../../app/infrastructure/rain_iso/package/package-validator.js";
async function main() {
    const args = parseArgs(process.argv.slice(2));
    const realtime1hPath = args["realtime-1h"] ?? "datas/01_raw/realtime_1h_response.json";
    const assetDirectory = args["asset-dir"] ?? "datas/03_dictionary/rain_iso/bj_1000m_union_assets";
    const frameTime = args["frame-time"] ?? "2026-06-19T23:00:00+08:00";
    const smoothRounds = parseOptionalNumber(args["smooth-rounds"]);
    const softObsMaxDelta = parseOptionalNumber(args["soft-obs-max-delta"]);
    const pixelScale = parseOptionalNumber(args["pixel-scale"]) ?? 4;
    const chartsDir = args["charts-dir"] ?? "uploads/02_charts/rain_iso_accum1h_single_2026-06-19";
    const exportsDir = args["exports-dir"] ?? "uploads/03_exports/rain_iso_accum1h_single_2026-06-19";
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
    const frame = buildDirectFrames(accumSequence).find((candidate) => candidate.frameTime === frameTime);
    if (!frame) {
        throw new Error(`未找到时次 ${frameTime}`);
    }
    const frameResult = runFrameOnCpu(frame, {
        assets,
        selectedBackend: "cpu",
        smoothConfig: {
            rounds: smoothRounds,
            softObsMaxDelta
        }
    });
    const rendered = renderGridLayer({
        frameResult,
        gridMeta: assets.gridMeta,
        pixelScale,
        renderBoundary: assets.renderBoundary,
        gridResolutionM: assets.manifest.grid_resolution_m
    });
    const bmp = encodeRenderedBmp(rendered);
    const stamp = frame.frameTime.replace(/[:+]/g, "-");
    const bmpPath = join(chartsDir, `${frame.frameType}_${stamp}.bmp`);
    const summaryPath = join(exportsDir, "summary.json");
    await Promise.all([
        writeFile(bmpPath, bmp),
        writeFile(summaryPath, JSON.stringify({
            sourcePath: resolve(realtime1hPath),
            assetDirectory: resolve(assetDirectory),
            frameKey: frame.frameKey,
            frameTime: frame.frameTime,
            maxValue: frameResult.summary.maxValue,
            renderableGridCount: frameResult.summary.renderableGridCount,
            hardAnchorCount: frameResult.summary.hardAnchorCount,
            softObsCount: frameResult.summary.softObsCount,
            ordinaryOnlyMode: frameResult.summary.ordinaryOnlyMode,
            bmpPath: resolve(bmpPath)
        }, null, 2) + "\n", "utf8")
    ]);
    console.log(JSON.stringify({
        frameKey: frame.frameKey,
        chartsDir: resolve(chartsDir),
        summaryPath: resolve(summaryPath)
    }, null, 2));
}
function parseArgs(argv) {
    const args = {};
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
function parseOptionalNumber(value) {
    if (!value) {
        return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
async function readRawRainApiResponse(filePath) {
    return JSON.parse(await readFile(filePath, "utf8"));
}
void main().catch((error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
});
