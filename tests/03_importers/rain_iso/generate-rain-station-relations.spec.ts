import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

import { describe, expect, it } from "vitest";

function runPythonScript(args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("python3", args, {
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

describe("generate_rain_station_relations.py", () => {
  it("能从全部雨量站.xls 生成站点清单与 5km 关联关系成果数据", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "rain-station-relations-"));
    const stationsOut = join(outputDir, "all_rain_stations.json");
    const relationsOut = join(outputDir, "station_neighbor_relations_5km.json");

    const result = await runPythonScript([
      "scripts/02_jobs/generate_rain_station_relations.py",
      "--input",
      "datas/01_raw/全部雨量站.xls",
      "--stations-out",
      stationsOut,
      "--relations-out",
      relationsOut
    ]);

    expect(result.code, result.stderr).toBe(0);

    const stations = JSON.parse(await readFile(stationsOut, "utf8")) as {
      station_count: number;
      duplicate_station_id_count: number;
      skipped_missing_coordinate_count: number;
      stations: Array<{
        station_id: string;
        system_id: string;
        station_name: string;
        longitude: number;
        latitude: number;
      }>;
    };
    const relations = JSON.parse(await readFile(relationsOut, "utf8")) as {
      fallback_neighbor_count: number;
      relations: Array<{
        station_id: string;
        neighbors_within_5km: Array<{
          station_id: string;
          distance_m: number;
        }>;
        fallback_nearest_neighbors: Array<{
          station_id: string;
          distance_m: number;
        }>;
      }>;
    };

    expect(stations.station_count).toBe(7648);
    expect(stations.duplicate_station_id_count).toBe(2);
    expect(stations.skipped_missing_coordinate_count).toBe(34);
    expect(stations.stations.length).toBe(stations.station_count);
    expect(relations.relations.length).toBe(stations.stations.length);

    const firstStation = stations.stations[0];
    expect(firstStation.station_id).toBeTypeOf("string");
    expect(firstStation.station_name).toBeTypeOf("string");
    expect(firstStation.longitude).toBeTypeOf("number");
    expect(firstStation.latitude).toBeTypeOf("number");

    const firstRelation = relations.relations[0];
    expect(firstRelation.station_id).toBe(firstStation.station_id);
    expect(relations.fallback_neighbor_count).toBe(4);
    expect(firstRelation.fallback_nearest_neighbors.length).toBeLessThanOrEqual(4);

    const fallbackDistances = firstRelation.fallback_nearest_neighbors.map(
      (neighbor) => neighbor.distance_m
    );
    expect([...fallbackDistances].sort((left, right) => left - right)).toEqual(
      fallbackDistances
    );

    expect(stations.stations).toContainEqual(
      expect.objectContaining({
        station_id: "B3313",
        system_id: "B3313",
        station_name: "张家口下花园棘针屯",
        longitude: 115.2686,
        latitude: 40.4572
      })
    );
    expect(stations.stations).toContainEqual(
      expect.objectContaining({
        station_id: "1101061002040400010001",
        system_id: "FXGZ1000",
        station_name: "李家峪①",
        longitude: 116.1417,
        latitude: 39.8361
      })
    );
    expect(stations.stations.find((station) => station.station_id === "A1702")).toBeUndefined();

    for (const neighbor of firstRelation.neighbors_within_5km) {
      expect(neighbor.distance_m).toBeLessThanOrEqual(5000);
    }
  });
});
