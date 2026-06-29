export function buildRainIsoSequenceFromApiResponse(apiResponse, options) {
    const frameTimes = Object.keys(apiResponse.data)
        .map(normalizeApiTime)
        .sort();
    const recordsByNormalizedTime = new Map();
    for (const [rawTime, records] of Object.entries(apiResponse.data)) {
        recordsByNormalizedTime.set(normalizeApiTime(rawTime), records);
    }
    const stationMetaById = {};
    const stationIds = Array.from(new Set(Object.values(apiResponse.data)
        .flat()
        .map((record) => record.stcd))).sort();
    for (const records of Object.values(apiResponse.data)) {
        for (const record of records) {
            if (!stationMetaById[record.stcd]) {
                stationMetaById[record.stcd] = record;
            }
        }
    }
    const values = new Float32Array(frameTimes.length * stationIds.length);
    values.fill(Number.NaN);
    const stationIndexById = new Map(stationIds.map((stationId, index) => [stationId, index]));
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
function normalizeApiTime(rawTime) {
    const [datePart, timePart] = rawTime.split(" ");
    return `${datePart}T${timePart}+08:00`;
}
