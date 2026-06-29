import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { FrameType } from "../../../app/domain/rain_iso/models.js";
import { loadRainIsoPackage } from "../../../app/infrastructure/rain_iso/package/package-loader.js";
import { PackageValidationError } from "../../../app/infrastructure/rain_iso/package/package-validator.js";

describe("loadRainIsoPackage", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dirPath) => rm(dirPath, { recursive: true, force: true })));
  });

  it("能读取 5 分钟和 1 小时原始接口文件，并整理成直接序列", async () => {
    const packageDir = await mkdtemp(join(tmpdir(), "rain-iso-raw-package-"));
    tempDirs.push(packageDir);

    await writeFile(
      join(packageDir, "realtime_5m_response.json"),
      JSON.stringify(
        {
          code: "0",
          msg: "操作成功",
          data: {
            "2026-06-24 13:55:00": [station("A001", 0.5), station("B002", 1.2)],
            "2026-06-24 13:50:00": [station("B002", 0), station("A001", 0.2)]
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(packageDir, "realtime_1h_response.json"),
      JSON.stringify(
        {
          code: "0",
          msg: "操作成功",
          data: {
            "2026-06-24 15:00:00": [station("B002", 12.8), station("A001", 10.4)],
            "2026-06-24 14:00:00": [station("A001", 6.2), station("B002", 8.5)]
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const dataPackage = await loadRainIsoPackage({
      realtime5mPath: join(packageDir, "realtime_5m_response.json"),
      realtime1hPath: join(packageDir, "realtime_1h_response.json")
    });

    expect(dataPackage.rain5m.productType).toBe(FrameType.Rain5m);
    expect(dataPackage.rain5m.frameTimes).toEqual([
      "2026-06-24T13:50:00+08:00",
      "2026-06-24T13:55:00+08:00"
    ]);
    expect(dataPackage.accum1h.productType).toBe(FrameType.Accum1hStep);
    expect(dataPackage.accum1h.frameTimes).toEqual([
      "2026-06-24T14:00:00+08:00",
      "2026-06-24T15:00:00+08:00"
    ]);
    expect(dataPackage.stationIds).toEqual(["A001", "B002"]);
  });

  it("时间步长不符合产品类型时拒绝执行", async () => {
    const packageDir = await mkdtemp(join(tmpdir(), "rain-iso-raw-invalid-"));
    tempDirs.push(packageDir);

    await writeFile(
      join(packageDir, "realtime_5m_response.json"),
      JSON.stringify(
        {
          code: "0",
          msg: "操作成功",
          data: {
            "2026-06-24 13:55:00": [station("A001", 0.5)],
            "2026-06-24 13:40:00": [station("A001", 0.2)]
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(packageDir, "realtime_1h_response.json"),
      JSON.stringify(
        {
          code: "0",
          msg: "操作成功",
          data: {
            "2026-06-24 14:00:00": [station("A001", 6.2)],
            "2026-06-24 15:00:00": [station("A001", 10.4)]
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(
      loadRainIsoPackage({
        realtime5mPath: join(packageDir, "realtime_5m_response.json"),
        realtime1hPath: join(packageDir, "realtime_1h_response.json")
      })
    ).rejects.toMatchObject({
      code: "PACKAGE_VALIDATION_FAILED"
    });
  });
});

function station(stcd: string, drp: number) {
  return {
    sysid: stcd,
    stcd,
    stnm: stcd,
    rvnm: "",
    hnnm: "",
    lgtd: 116.1,
    lttd: 39.9,
    stlc: "",
    addvcd: "110100",
    addvnm: "北京",
    adnm: "",
    stlvl: "5",
    admauth: "气象局",
    isOut: "",
    drp,
    bscd: "",
    bsnm: "",
    area: "110100",
    star: 0
  };
}
