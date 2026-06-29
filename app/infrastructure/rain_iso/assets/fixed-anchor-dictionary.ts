import { readFile } from "node:fs/promises";

export type FixedAnchorDictionary = {
  stations: Array<{
    station_id: string;
  }>;
};

export async function loadFixedAnchorDictionary(
  filePath: string
): Promise<FixedAnchorDictionary> {
  return JSON.parse(await readFile(filePath, "utf8")) as FixedAnchorDictionary;
}
