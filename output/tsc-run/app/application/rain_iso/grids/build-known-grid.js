export function buildKnownGrid(options) {
    const knownMask = new Uint8Array(options.hardAnchorMask.length);
    for (let index = 0; index < knownMask.length; index += 1) {
        knownMask[index] =
            options.hardAnchorMask[index] === 1 || options.softObsMask[index] === 1 ? 1 : 0;
    }
    return knownMask;
}
