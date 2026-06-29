import { createHash } from "node:crypto";
export function createSha256Checksum(bytes) {
    return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
export function assertSha256Checksum(fileName, bytes, expectedChecksum) {
    const actualChecksum = createSha256Checksum(bytes);
    if (actualChecksum !== expectedChecksum) {
        throw new Error(`${fileName} checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
    }
}
