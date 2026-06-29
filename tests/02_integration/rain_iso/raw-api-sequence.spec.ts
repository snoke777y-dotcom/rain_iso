import { describe, expect, it } from "vitest";

import {
  buildRainIsoSequenceFromApiResponse
} from "../../../app/infrastructure/rain_iso/package/raw-api-adapter.js";

describe("buildRainIsoSequenceFromApiResponse", () => {
  it("按时间升序和 stcd 稳定化原始接口序列", () => {
    const apiResponse = {
      code: "0",
      msg: "操作成功",
      data: {
        "2026-06-24 13:55:00": [
          {
            sysid: "2",
            stcd: "B002",
            stnm: "站点二",
            rvnm: "",
            hnnm: "",
            lgtd: 116.2,
            lttd: 39.9,
            stlc: "",
            addvcd: "110100",
            addvnm: "北京",
            adnm: "",
            stlvl: "5",
            admauth: "气象局",
            isOut: "",
            drp: 1.2,
            bscd: "",
            bsnm: "",
            area: "110100",
            star: 0
          },
          {
            sysid: "1",
            stcd: "A001",
            stnm: "站点一",
            rvnm: "",
            hnnm: "",
            lgtd: 116.1,
            lttd: 39.8,
            stlc: "",
            addvcd: "110100",
            addvnm: "北京",
            adnm: "",
            stlvl: "12",
            admauth: "险村",
            isOut: "",
            drp: 0.5,
            bscd: "",
            bsnm: "",
            area: "110100",
            star: 0
          }
        ],
        "2026-06-24 13:50:00": [
          {
            sysid: "1",
            stcd: "A001",
            stnm: "站点一",
            rvnm: "",
            hnnm: "",
            lgtd: 116.1,
            lttd: 39.8,
            stlc: "",
            addvcd: "110100",
            addvnm: "北京",
            adnm: "",
            stlvl: "12",
            admauth: "险村",
            isOut: "",
            drp: 0.2,
            bscd: "",
            bsnm: "",
            area: "110100",
            star: 0
          },
          {
            sysid: "2",
            stcd: "B002",
            stnm: "站点二",
            rvnm: "",
            hnnm: "",
            lgtd: 116.2,
            lttd: 39.9,
            stlc: "",
            addvcd: "110100",
            addvnm: "北京",
            adnm: "",
            stlvl: "5",
            admauth: "气象局",
            isOut: "",
            drp: 0,
            bscd: "",
            bsnm: "",
            area: "110100",
            star: 0
          }
        ]
      }
    };

    const sequence = buildRainIsoSequenceFromApiResponse(apiResponse, {
      productType: "rain_5m"
    });

    expect(sequence.frameTimes).toEqual([
      "2026-06-24T13:50:00+08:00",
      "2026-06-24T13:55:00+08:00"
    ]);
    expect(sequence.stationIds).toEqual(["A001", "B002"]);
    expect(Array.from(sequence.values).map((value) => Number(value.toFixed(3)))).toEqual([
      0.2,
      0,
      0.5,
      1.2
    ]);
    expect(sequence.stationMetaById.A001.admauth).toBe("险村");
    expect(sequence.stationMetaById.B002.admauth).toBe("气象局");
  });
});
