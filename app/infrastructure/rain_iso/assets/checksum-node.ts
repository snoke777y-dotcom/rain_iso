import { createHash } from "node:crypto";

import { AssetValidationError } from "./asset-validator.js";

export function assertNodeChecksum(
  fileName: string,
  bytes: Uint8Array,
  expectedChecksum: string
): void {
  const actualChecksum = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (actualChecksum !== expectedChecksum) {
    throw new AssetValidationError(
      `${fileName} checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`
    );
  }
}
