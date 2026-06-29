import { FrameType } from "../../../domain/rain_iso/models.js";

export type RawRainRecord = {
  sysid: string;
  stcd: string;
  stnm: string;
  rvnm: string;
  hnnm: string;
  lgtd: number;
  lttd: number;
  stlc: string;
  addvcd: string;
  addvnm: string;
  adnm: string;
  stlvl: string;
  admauth: string;
  isOut: string;
  drp: number;
  bscd: string;
  bsnm: string;
  area: string;
  star: number;
};

export type RawRainApiResponse = {
  code: string;
  msg: string;
  data: Record<string, RawRainRecord[]>;
};

export type RainIsoDirectSequence = {
  frameTimes: string[];
  productType: FrameType;
  stationIds: string[];
  stationMetaById: Record<string, RawRainRecord>;
  values: Float32Array;
};

export function buildRainIsoSequenceFromApiResponse(
  apiResponse: RawRainApiResponse,
  options: {
    productType: FrameType;
  }
): RainIsoDirectSequence {
  const frameTimes = Object.keys(apiResponse.data)
    .map(normalizeApiTime)
    .sort();

  const recordsByNormalizedTime = new Map<string, RawRainRecord[]>();
  for (const [rawTime, records] of Object.entries(apiResponse.data)) {
    recordsByNormalizedTime.set(normalizeApiTime(rawTime), records);
  }

  const stationMetaById: Record<string, RawRainRecord> = {};
  const stationIds = Array.from(
    new Set(
      Object.values(apiResponse.data)
        .flat()
        .map((record) => record.stcd)
    )
  ).sort();

  for (const records of Object.values(apiResponse.data)) {
    for (const record of records) {
      if (!stationMetaById[record.stcd]) {
        stationMetaById[record.stcd] = record;
      }
    }
  }

  const values = new Float32Array(frameTimes.length * stationIds.length);
  values.fill(Number.NaN);

  const stationIndexById = new Map(
    stationIds.map((stationId, index) => [stationId, index])
  );

  frameTimes.forEach((frameTime, frameIndex) => {
    const records = recordsByNormalizedTime.get(frameTime) ?? [];
    for (const record of records) {
      const stationIndex = stationIndexById.get(record.stcd);
      if (stationIndex === undefined) {
        continue;
      }

      values[frameIndex * stationIds.length + stationIndex] = record.drp;
    }
  });

  return {
    frameTimes,
    productType: options.productType,
    stationIds,
    stationMetaById,
    values
  };
}

function normalizeApiTime(rawTime: string): string {
  const [datePart, timePart] = rawTime.split(" ");
  return `${datePart}T${timePart}+08:00`;
}
