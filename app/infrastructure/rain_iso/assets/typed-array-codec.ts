type SupportedTypedArray = Int32Array | Float32Array | Uint8Array;
type SupportedTypeName = "Int32Array" | "Float32Array" | "Uint8Array";

type EncodedField = {
  name: string;
  type: SupportedTypeName;
  length: number;
  byteOffset: number;
  byteLength: number;
};

type EncodedPayload = {
  version: 1;
  fields: EncodedField[];
};

const MAGIC = "RTA1";

export function encodeNamedTypedArrays(
  fields: Record<string, SupportedTypedArray>
): Uint8Array {
  const payloadFields: EncodedField[] = [];
  const rawChunks: Uint8Array[] = [];
  let byteOffset = 0;

  for (const [name, array] of Object.entries(fields)) {
    const chunk = new Uint8Array(
      array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength)
    );
    payloadFields.push({
      name,
      type: detectTypeName(array),
      length: array.length,
      byteOffset,
      byteLength: chunk.byteLength
    });
    rawChunks.push(chunk);
    byteOffset += chunk.byteLength;
  }

  const payloadBytes = new TextEncoder().encode(
    JSON.stringify({
      version: 1,
      fields: payloadFields
    } satisfies EncodedPayload)
  );
  const header = new Uint8Array(8);
  header.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(header.buffer).setUint32(4, payloadBytes.byteLength, true);

  return concatUint8Arrays([header, payloadBytes, ...rawChunks]);
}

export function decodeNamedTypedArrays(
  bytes: Uint8Array
): Record<string, SupportedTypedArray> {
  const buffer = normalizeToUint8Array(bytes);
  const headerView = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );
  const magic = new TextDecoder().decode(buffer.subarray(0, 4));
  if (magic !== MAGIC) {
    throw new Error(`Unsupported typed array binary magic: ${magic}`);
  }

  const payloadLength = headerView.getUint32(4, true);
  const payloadStart = 8;
  const payloadEnd = payloadStart + payloadLength;
  const payload = JSON.parse(
    new TextDecoder().decode(buffer.subarray(payloadStart, payloadEnd))
  ) as EncodedPayload;

  const result: Record<string, SupportedTypedArray> = {};
  const rawBase = payloadEnd;

  for (const field of payload.fields) {
    const rawSlice = buffer.slice(
      rawBase + field.byteOffset,
      rawBase + field.byteOffset + field.byteLength
    );
    result[field.name] = createTypedArray(field.type, rawSlice.buffer, field.length);
  }

  return result;
}

function detectTypeName(array: SupportedTypedArray): SupportedTypeName {
  if (array instanceof Int32Array) {
    return "Int32Array";
  }

  if (array instanceof Float32Array) {
    return "Float32Array";
  }

  return "Uint8Array";
}

function createTypedArray(
  type: SupportedTypeName,
  buffer: ArrayBufferLike,
  length: number
): SupportedTypedArray {
  switch (type) {
    case "Int32Array":
      return new Int32Array(buffer.slice(0), 0, length);
    case "Float32Array":
      return new Float32Array(buffer.slice(0), 0, length);
    case "Uint8Array":
      return new Uint8Array(buffer.slice(0), 0, length);
  }
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let cursor = 0;

  for (const chunk of chunks) {
    merged.set(chunk, cursor);
    cursor += chunk.byteLength;
  }

  return merged;
}

function normalizeToUint8Array(bytes: Uint8Array): Uint8Array {
  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
