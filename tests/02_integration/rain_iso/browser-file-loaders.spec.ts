import { describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import {
  loadAssetBundleFromDirectory,
  loadAssetBundleFromZip,
  loadRainPackageFromFiles
} from "../../../app/interfaces/rain_iso/browser/index.js";
import {
  createRawRainPackageFiles,
  createSampleAssetZipFile,
  createSampleBrowserAssetFiles
} from "../../helpers/rain_iso_browser_fixtures.js";

describe("browser file loaders", () => {
  it("目录模式能读取资产包和外部字典", async () => {
    const fixture = createSampleBrowserAssetFiles();

    const assets = await loadAssetBundleFromDirectory({
      files: fixture.files
    });

    expect(assets.manifest.asset_version).toBe("2026-06-bj-grid-v1");
    expect(Array.from(assets.gridMeta.gridId)).toEqual([0, 1]);
    expect(assets.fixedAnchorStationIds).toEqual(new Set(["fortress-1", "cross-1"]));
    expect(assets.fallbackNeighborStationIdsByStationId.get("fortress-1")).toEqual([
      "ordinary-1",
      "cross-1"
    ]);
  });

  it("zip 模式能解压并读取资产包", async () => {
    const zipFile = createSampleAssetZipFile();

    const assets = await loadAssetBundleFromZip(zipFile);

    expect(assets.stationMeta.station_count).toBe(3);
    expect(assets.manifest.bbox_render).toEqual([0, 0, 2, 1]);
  });

  it("动态双 JSON 能转成浏览器可运行的数据包", async () => {
    const files = createRawRainPackageFiles();

    const dataPackage = await loadRainPackageFromFiles(files);

    expect(dataPackage.stationIds).toEqual(["cross-1", "fortress-1", "ordinary-1"]);
    expect(dataPackage.rain5m.productType).toBe(FrameType.Rain5m);
    expect(dataPackage.accum1h.productType).toBe(FrameType.Accum1hStep);
    expect(dataPackage.rain5m.frameTimes).toHaveLength(2);
    expect(dataPackage.accum1h.frameTimes).toHaveLength(2);
  });

  it("只导入 5 分钟 JSON 时会补一个空的 1 小时序列", async () => {
    const files = createRawRainPackageFiles();

    const dataPackage = await loadRainPackageFromFiles({
      realtime5mFile: files.realtime5mFile
    });

    expect(dataPackage.stationIds).toEqual(["cross-1", "fortress-1", "ordinary-1"]);
    expect(dataPackage.rain5m.frameTimes).toHaveLength(2);
    expect(dataPackage.accum1h.productType).toBe(FrameType.Accum1hStep);
    expect(dataPackage.accum1h.stationIds).toEqual(dataPackage.rain5m.stationIds);
    expect(dataPackage.accum1h.frameTimes).toEqual([]);
    expect(Array.from(dataPackage.accum1h.values)).toEqual([]);
  });

  it("只导入 1 小时 JSON 时会补一个空的 5 分钟序列", async () => {
    const files = createRawRainPackageFiles();

    const dataPackage = await loadRainPackageFromFiles({
      realtime1hFile: files.realtime1hFile
    });

    expect(dataPackage.stationIds).toEqual(["cross-1", "fortress-1", "ordinary-1"]);
    expect(dataPackage.accum1h.frameTimes).toHaveLength(2);
    expect(dataPackage.rain5m.productType).toBe(FrameType.Rain5m);
    expect(dataPackage.rain5m.stationIds).toEqual(dataPackage.accum1h.stationIds);
    expect(dataPackage.rain5m.frameTimes).toEqual([]);
    expect(Array.from(dataPackage.rain5m.values)).toEqual([]);
  });
});
