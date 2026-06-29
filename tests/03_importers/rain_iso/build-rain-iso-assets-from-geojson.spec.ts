import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { decodeNamedTypedArrays } from "../../../app/infrastructure/rain_iso/assets/typed-array-codec.js";

function runNodeScript(args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("node", args, {
      cwd: resolve("."),
      env: { ...process.env }
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      resolvePromise({ code, stderr });
    });
  });
}

describe("build_rain_iso_assets_from_geojson.mjs", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dirPath) => rm(dirPath, { recursive: true, force: true })));
  });

  it("能从边界并集生成 1000m 网格资产和站点映射", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "rain-iso-geo-assets-"));
    tempDirs.push(workDir);

    const cityBoundaryPath = join(workDir, "city.geojson");
    const outsideBoundaryPath = join(workDir, "outside.geojson");
    const stationMetaPath = join(workDir, "station_meta.json");
    const outputDir = join(workDir, "assets");

    await writeFile(cityBoundaryPath, JSON.stringify(createSquareFeatureCollection(116, 39, 116.03, 39.03)));
    await writeFile(
      outsideBoundaryPath,
      JSON.stringify(createSquareFeatureCollection(116.03, 39, 116.04, 39.01))
    );
    await writeFile(
      stationMetaPath,
      JSON.stringify(
        {
          station_count: 2,
          stations: [
            {
              station_id: "A",
              system_id: "SYS-A",
              station_name: "Alpha",
              basin_name: "",
              admin_authority: "",
              admin_division_name: "",
              lon: 116.005,
              lat: 39.005,
              is_fortress_anchor: false,
              is_tongzhou_anchor: false,
              is_cross_boundary_anchor: false
            },
            {
              station_id: "B",
              system_id: "SYS-B",
              station_name: "Beta",
              basin_name: "",
              admin_authority: "",
              admin_division_name: "",
              lon: 116.035,
              lat: 39.005,
              is_fortress_anchor: true,
              is_tongzhou_anchor: false,
              is_cross_boundary_anchor: false
            }
          ]
        },
        null,
        2
      )
    );

    const result = await runNodeScript([
      "scripts/02_jobs/build_rain_iso_assets_from_geojson.mjs",
      "--city-boundary",
      cityBoundaryPath,
      "--outside-boundary",
      outsideBoundaryPath,
      "--station-meta",
      stationMetaPath,
      "--output-dir",
      outputDir,
      "--resolution-m",
      "1000",
      "--asset-version",
      "test-grid-v1"
    ]);

    expect(result.code, result.stderr).toBe(0);

    const manifest = JSON.parse(await readFile(join(outputDir, "asset_manifest.json"), "utf8")) as {
      asset_version: string;
      grid_count: number;
      files: Record<string, string>;
    };
    const renderBoundary = JSON.parse(
      await readFile(join(outputDir, "render_boundary.geojson"), "utf8")
    ) as {
      type: string;
      features: Array<unknown>;
    };
    const gridMeta = decodeNamedTypedArrays(
      new Uint8Array(await readFile(join(outputDir, "grid_meta.bin")))
    );
    const gridNeighbors = decodeNamedTypedArrays(
      new Uint8Array(await readFile(join(outputDir, "grid_neighbors.bin")))
    );
    const stationToGrid = decodeNamedTypedArrays(
      new Uint8Array(await readFile(join(outputDir, "station_to_grid.bin")))
    );
    const gridMask = new Uint8Array(await readFile(join(outputDir, "grid_mask.bin")));

    expect(manifest.asset_version).toBe("test-grid-v1");
    expect(manifest.grid_count).toBeGreaterThan(0);
    expect(renderBoundary.type).toBe("FeatureCollection");
    expect(renderBoundary.features.length).toBe(2);
    expect((gridMeta.grid_id as Int32Array).length).toBe(manifest.grid_count);
    expect((gridNeighbors.neighbors as Int32Array).length).toBe(manifest.grid_count * 8);
    expect((stationToGrid.grid_id as Int32Array).length).toBe(2);
    expect(gridMask.length).toBe(manifest.grid_count);
    expect(Array.from(stationToGrid.grid_id as Int32Array).every((gridId) => gridId >= 0)).toBe(true);
    expect(Array.from(gridMask).some((value) => value === 1)).toBe(true);
  });
});

function createSquareFeatureCollection(
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number
) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [[
              [minLon, minLat],
              [maxLon, minLat],
              [maxLon, maxLat],
              [minLon, maxLat],
              [minLon, minLat]
            ]]
          ]
        }
      }
    ]
  };
}
