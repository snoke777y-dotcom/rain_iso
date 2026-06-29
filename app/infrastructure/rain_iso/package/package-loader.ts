import { readFile } from "node:fs/promises";

import { FrameType } from "../../../domain/rain_iso/models.js";
import {
  buildRainIsoSequenceFromApiResponse,
  type RawRainApiResponse
} from "./raw-api-adapter.js";
import {
  PackageValidationError,
  validateLoadedRainIsoPackage,
  validateRawPackage
} from "./package-validator.js";

export async function loadRainIsoPackage(options: {
  realtime5mPath: string;
  realtime1hPath: string;
}): Promise<{
  stationIds: string[];
  rain5m: ReturnType<typeof buildRainIsoSequenceFromApiResponse>;
  accum1h: ReturnType<typeof buildRainIsoSequenceFromApiResponse>;
}> {
  const rawPackage = {
    realtime5mResponse: await readRawRainApiResponse(options.realtime5mPath),
    realtime1hResponse: await readRawRainApiResponse(options.realtime1hPath)
  };

  validateRawPackage(rawPackage);

  const rain5m = buildRainIsoSequenceFromApiResponse(
    rawPackage.realtime5mResponse,
    {
      productType: FrameType.Rain5m
    }
  );
  const accum1h = buildRainIsoSequenceFromApiResponse(
    rawPackage.realtime1hResponse,
    {
      productType: FrameType.Accum1hStep
    }
  );

  const dataPackage = {
    stationIds: rain5m.stationIds,
    rain5m,
    accum1h
  };

  validateLoadedRainIsoPackage(dataPackage);
  return dataPackage;
}

async function readRawRainApiResponse(filePath: string): Promise<RawRainApiResponse> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as RawRainApiResponse;
  } catch (error) {
    throw new PackageValidationError(
      error instanceof Error ? error.message : "无法读取原始接口文件"
    );
  }
}
