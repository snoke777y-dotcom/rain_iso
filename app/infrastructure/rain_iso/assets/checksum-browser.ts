import { AssetValidationError } from "./asset-validator.js";

export async function assertBrowserChecksum(
  fileName: string,
  bytes: Uint8Array,
  expectedChecksum: string
): Promise<void> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    copy.buffer
  );
  const actualChecksum = `sha256:${Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;

  if (actualChecksum !== expectedChecksum) {
    throw new AssetValidationError(
      `${fileName} checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`
    );
  }
}
