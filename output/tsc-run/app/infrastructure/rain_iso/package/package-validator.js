import { FrameType } from "../../../domain/rain_iso/models.js";
export class PackageValidationError extends Error {
    code = "PACKAGE_VALIDATION_FAILED";
    constructor(message) {
        super(message);
        this.name = "PackageValidationError";
    }
}
export function validateRawRainApiResponse(response, options) {
    if (response.code !== "0") {
        throw new PackageValidationError(`${options.expectedProductType} response code must be 0`);
    }
    const timeKeys = Object.keys(response.data ?? {});
    if (timeKeys.length === 0) {
        throw new PackageValidationError(`${options.expectedProductType} response must contain at least one frame`);
    }
    const baseStationIds = new Set((response.data[timeKeys[0]] ?? []).map((record) => record.stcd));
    if (baseStationIds.size === 0) {
        throw new PackageValidationError(`${options.expectedProductType} response must contain at least one station`);
    }
    for (const timeKey of timeKeys.slice(1)) {
        const stationIds = new Set((response.data[timeKey] ?? []).map((record) => record.stcd));
        if (stationIds.size !== baseStationIds.size) {
            throw new PackageValidationError(`${options.expectedProductType} station count mismatch across frames`);
        }
        for (const stationId of baseStationIds) {
            if (!stationIds.has(stationId)) {
                throw new PackageValidationError(`${options.expectedProductType} station set mismatch across frames`);
            }
        }
    }
}
export function validateLoadedRainIsoPackage(dataPackage) {
    if (dataPackage.rain5m.stationIds.join("|") !== dataPackage.accum1h.stationIds.join("|")) {
        throw new PackageValidationError("5 分钟和 1 小时接口的站点集合不一致");
    }
    validateSequenceStep(dataPackage.rain5m.frameTimes, 5, "5 分钟");
    validateSequenceStep(dataPackage.accum1h.frameTimes, 60, "1 小时");
}
export function validateRawPackage(rawPackage) {
    validateRawRainApiResponse(rawPackage.realtime5mResponse, {
        expectedProductType: FrameType.Rain5m
    });
    validateRawRainApiResponse(rawPackage.realtime1hResponse, {
        expectedProductType: FrameType.Accum1hStep
    });
}
function validateSequenceStep(frameTimes, expectedMinutes, label) {
    for (let index = 1; index < frameTimes.length; index += 1) {
        const previous = Date.parse(frameTimes[index - 1]);
        const current = Date.parse(frameTimes[index]);
        if (current - previous !== expectedMinutes * 60 * 1000) {
            throw new PackageValidationError(`${label}序列时间步长不正确`);
        }
    }
}
