import { readFile } from "node:fs/promises";
export async function loadFixedAnchorDictionary(filePath) {
    return JSON.parse(await readFile(filePath, "utf8"));
}
