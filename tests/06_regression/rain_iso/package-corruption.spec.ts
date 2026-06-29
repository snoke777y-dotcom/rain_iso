import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { loadRainIsoPackage } from "../../../app/infrastructure/rain_iso/package/package-loader.js";
import { PackageValidationError } from "../../../app/infrastructure/rain_iso/package/package-validator.js";

describe("rain iso raw package validation", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dirPath) => rm(dirPath, { recursive: true, force: true })));
  });

  it("两份接口的站点集合不一致时稳定拒绝执行", async () => {
    const packageDir = await mkdtemp(join(tmpdir(), "rain-iso-raw-mismatch-"));
    tempDirs.push(packageDir);

    await writeFile(
      join(packageDir, "realtime_5m_response.json"),
      JSON.stringify(
        {
          code: "0",
          msg: "操作成功",
          data: {
            "2026-06-24 13:50:00": [station("A001", 0.2), station("B002", 0)]
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
            "2026-06-24 14:00:00": [station("A001", 6.2), station("C003", 8.5)]
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
