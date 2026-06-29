import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const RAIN_ISO_PROTOCOL_VERSION = "1.0.0";
const RAIN_ISO_ALGORITHM_PROFILE_VERSION = "rain-iso-profile-v1";

const WEB_MERCATOR_MAX_LAT = 85.05112878;
const MAGIC = "RTA1";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const resolutionM = Number(args["resolution-m"] ?? "1000");
  if (!Number.isFinite(resolutionM) || resolutionM <= 0) {
    throw new Error("--resolution-m 必须是正数");
  }

  const cityBoundaryPath = requiredArg(args, "city-boundary");
  const outsideBoundaryPath = requiredArg(args, "outside-boundary");
  const stationMetaPath = requiredArg(args, "station-meta");
  const outputDir = requiredArg(args, "output-dir");
  const assetVersion = args["asset-version"] ?? "bj-geo-grid-v1";

  const [cityBoundary, outsideBoundary, stationMeta] = await Promise.all([
    readJson(cityBoundaryPath),
    readJson(outsideBoundaryPath),
    readJson(stationMetaPath)
  ]);

  const unionBoundary = {
    type: "FeatureCollection",
    features: [...(cityBoundary.features ?? []), ...(outsideBoundary.features ?? [])]
  };
  const polygons = collectMultiPolygons(unionBoundary);
  if (polygons.length === 0) {
    throw new Error("边界数据为空");
  }

  const bbox = computeProjectedBbox(polygons);
  const aligned = alignBboxToResolution(bbox, resolutionM);
  const grid = buildValidGrid({
    polygons,
    resolutionM,
    aligned
  });
  const stationToGrid = buildStationToGrid(stationMeta.stations ?? [], grid);

  await mkdir(outputDir, { recursive: true });

  const stationMetaOut = JSON.stringify(stationMeta, null, 2) + "\n";
  const renderBoundaryOut = JSON.stringify(unionBoundary, null, 2) + "\n";
  const gridMetaBytes = encodeNamedTypedArrays({
    grid_id: grid.gridId,
    row: grid.row,
    col: grid.col,
    center_x: grid.centerX,
    center_y: grid.centerY
  });
  const gridNeighborsBytes = encodeNamedTypedArrays({
    neighbors: grid.neighbors
  });
  const stationToGridBytes = encodeNamedTypedArrays({
    grid_id: stationToGrid
  });
  const gridMaskBytes = new Uint8Array(grid.gridId.length).fill(1);

  await Promise.all([
    writeFile(join(outputDir, "grid_meta.bin"), gridMetaBytes),
    writeFile(join(outputDir, "grid_mask.bin"), gridMaskBytes),
    writeFile(join(outputDir, "grid_neighbors.bin"), gridNeighborsBytes),
    writeFile(join(outputDir, "station_to_grid.bin"), stationToGridBytes),
    writeFile(join(outputDir, "station_meta.json"), stationMetaOut, "utf8"),
    writeFile(join(outputDir, "render_boundary.geojson"), renderBoundaryOut, "utf8")
  ]);

  const manifest = {
    protocol_version: RAIN_ISO_PROTOCOL_VERSION,
    asset_version: assetVersion,
    algorithm_profile_version: RAIN_ISO_ALGORITHM_PROFILE_VERSION,
    city_code: "beijing",
    grid_resolution_m: resolutionM,
    grid_rows: grid.rows,
    grid_cols: grid.cols,
    grid_count: grid.gridId.length,
    valid_grid_count: grid.gridId.length,
    grid_crs: "EPSG:3857",
    render_crs: "EPSG:4326",
    bbox_projected: [aligned.minX, aligned.minY, aligned.maxX, aligned.maxY],
    bbox_render: computeLonLatBbox(polygons),
    files: {
      grid_meta: "grid_meta.bin",
      grid_mask: "grid_mask.bin",
      grid_neighbors: "grid_neighbors.bin",
      station_to_grid: "station_to_grid.bin",
      station_meta: "station_meta.json",
      render_boundary: "render_boundary.geojson"
    },
    checksums: {
      grid_meta: checksum(gridMetaBytes),
      grid_mask: checksum(gridMaskBytes),
      grid_neighbors: checksum(gridNeighborsBytes),
      station_to_grid: checksum(stationToGridBytes),
      station_meta: checksum(new TextEncoder().encode(stationMetaOut)),
      render_boundary: checksum(new TextEncoder().encode(renderBoundaryOut))
    }
  };

  await writeFile(
    join(outputDir, "asset_manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8"
  );

  console.log(
    JSON.stringify(
      {
        outputDir: resolve(outputDir),
        assetVersion,
        gridCount: grid.gridId.length,
        stationCount: stationToGrid.length,
        stationMetaFile: basename(stationMetaPath)
      },
      null,
      2
    )
  );
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = "true";
      continue;
    }

    args[key] = value;
    index += 1;
  }
  return args;
}

function requiredArg(args, key) {
  const value = args[key];
  if (!value) {
    throw new Error(`缺少参数 --${key}`);
  }
  return value;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function collectMultiPolygons(featureCollection) {
  const polygons = [];
  for (const feature of featureCollection.features ?? []) {
    if (feature?.geometry?.type !== "MultiPolygon") {
      continue;
    }

    for (const polygon of feature.geometry.coordinates) {
      polygons.push({
        rings: polygon,
        bbox: computePolygonLonLatBbox(polygon)
      });
    }
  }
  return polygons;
}

function computeProjectedBbox(polygons) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    for (const ring of polygon.rings) {
      for (const [lon, lat] of ring) {
        const point = lonLatToWebMercator(lon, lat);
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
  }

  return { minX, maxX, minY, maxY };
}

function computeLonLatBbox(polygons) {
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const polygon of polygons) {
    for (const ring of polygon.rings) {
      for (const [lon, lat] of ring) {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    }
  }

  return [minLon, minLat, maxLon, maxLat];
}

function alignBboxToResolution(bbox, resolutionM) {
  return {
    minX: Math.floor(bbox.minX / resolutionM) * resolutionM,
    maxX: Math.ceil(bbox.maxX / resolutionM) * resolutionM,
    minY: Math.floor(bbox.minY / resolutionM) * resolutionM,
    maxY: Math.ceil(bbox.maxY / resolutionM) * resolutionM
  };
}

function buildValidGrid({ polygons, resolutionM, aligned }) {
  const cols = Math.max(1, Math.round((aligned.maxX - aligned.minX) / resolutionM));
  const rows = Math.max(1, Math.round((aligned.maxY - aligned.minY) / resolutionM));
  const gridId = [];
  const row = [];
  const col = [];
  const centerX = [];
  const centerY = [];
  const gridIdByCell = new Map();
  let currentGridId = 0;

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const y = aligned.maxY - (rowIndex + 0.5) * resolutionM;
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const x = aligned.minX + (colIndex + 0.5) * resolutionM;
      if (!containsProjectedPoint(polygons, x, y)) {
        continue;
      }

      gridId.push(currentGridId);
      row.push(rowIndex);
      col.push(colIndex);
      centerX.push(x);
      centerY.push(y);
      gridIdByCell.set(cellKey(rowIndex, colIndex), currentGridId);
      currentGridId += 1;
    }
  }

  const neighbors = new Int32Array(currentGridId * 8).fill(-1);
  for (let index = 0; index < currentGridId; index += 1) {
    const rowIndex = row[index];
    const colIndex = col[index];
    const offsets = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    offsets.forEach(([rowOffset, colOffset], neighborIndex) => {
      const neighborGridId = gridIdByCell.get(cellKey(rowIndex + rowOffset, colIndex + colOffset));
      if (neighborGridId !== undefined) {
        neighbors[index * 8 + neighborIndex] = neighborGridId;
      }
    });
  }

  return {
    rows,
    cols,
    minX: aligned.minX,
    maxY: aligned.maxY,
    resolutionM,
    gridId: Int32Array.from(gridId),
    row: Int32Array.from(row),
    col: Int32Array.from(col),
    centerX: Float32Array.from(centerX),
    centerY: Float32Array.from(centerY),
    neighbors,
    gridIdByCell
  };
}

function buildStationToGrid(stations, grid) {
  const result = new Int32Array(stations.length).fill(-1);

  for (let index = 0; index < stations.length; index += 1) {
    const station = stations[index];
    const { x, y } = lonLatToWebMercator(station.lon, station.lat);
    const approxCol = clamp(
      Math.floor((x - grid.minX) / grid.resolutionM),
      0,
      grid.cols - 1
    );
    const approxRow = clamp(
      Math.floor((grid.maxY - y) / grid.resolutionM),
      0,
      grid.rows - 1
    );

    result[index] = findNearestGridId({
      x,
      y,
      approxRow,
      approxCol,
      grid
    });
  }

  return result;
}

function containsProjectedPoint(polygons, x, y) {
  const point = webMercatorToLonLat(x, y);
  return polygons.some((polygon) => polygonContainsPoint(polygon, point.lon, point.lat));
}

function polygonContainsPoint(polygon, lon, lat) {
  if (
    lon < polygon.bbox.minLon ||
    lon > polygon.bbox.maxLon ||
    lat < polygon.bbox.minLat ||
    lat > polygon.bbox.maxLat
  ) {
    return false;
  }

  if (!ringContainsPoint(polygon.rings[0], lon, lat)) {
    return false;
  }

  for (let index = 1; index < polygon.rings.length; index += 1) {
    if (ringContainsPoint(polygon.rings[index], lon, lat)) {
      return false;
    }
  }

  return true;
}

function ringContainsPoint(ring, lon, lat) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previous];
    const intersects =
      (y1 > lat) !== (y2 > lat) &&
      lon < ((x2 - x1) * (lat - y1)) / ((y2 - y1) || Number.EPSILON) + x1;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function lonLatToWebMercator(lon, lat) {
  const clampedLat = Math.max(-WEB_MERCATOR_MAX_LAT, Math.min(WEB_MERCATOR_MAX_LAT, lat));
  const x = (lon * 20037508.34) / 180;
  const y =
    Math.log(Math.tan(((90 + clampedLat) * Math.PI) / 360)) / (Math.PI / 180);
  return {
    x,
    y: (y * 20037508.34) / 180
  };
}

function webMercatorToLonLat(x, y) {
  const lon = (x / 20037508.34) * 180;
  const lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((y / 20037508.34) * Math.PI)) - Math.PI / 2);
  return { lon, lat };
}

function checksum(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function computePolygonLonLatBbox(polygon) {
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const ring of polygon) {
    for (const [lon, lat] of ring) {
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
  }

  return { minLon, maxLon, minLat, maxLat };
}

function findNearestGridId({ x, y, approxRow, approxCol, grid }) {
  for (let radius = 0; radius <= Math.max(grid.rows, grid.cols); radius += 1) {
    let bestGridId = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    const rowStart = Math.max(0, approxRow - radius);
    const rowEnd = Math.min(grid.rows - 1, approxRow + radius);
    const colStart = Math.max(0, approxCol - radius);
    const colEnd = Math.min(grid.cols - 1, approxCol + radius);

    for (let row = rowStart; row <= rowEnd; row += 1) {
      for (let col = colStart; col <= colEnd; col += 1) {
        if (
          radius > 0 &&
          row > rowStart &&
          row < rowEnd &&
          col > colStart &&
          col < colEnd
        ) {
          continue;
        }

        const gridId = grid.gridIdByCell.get(cellKey(row, col));
        if (gridId === undefined) {
          continue;
        }

        const centerX = grid.minX + (col + 0.5) * grid.resolutionM;
        const centerY = grid.maxY - (row + 0.5) * grid.resolutionM;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = dx * dx + dy * dy;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestGridId = gridId;
        }
      }
    }

    if (bestGridId >= 0) {
      return bestGridId;
    }
  }

  return -1;
}

function cellKey(row, col) {
  return `${row}:${col}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function encodeNamedTypedArrays(fields) {
  const payloadFields = [];
  const rawChunks = [];
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
    })
  );
  const header = new Uint8Array(8);
  header.set(new TextEncoder().encode(MAGIC), 0);
  new DataView(header.buffer).setUint32(4, payloadBytes.byteLength, true);

  return concatUint8Arrays([header, payloadBytes, ...rawChunks]);
}

function detectTypeName(array) {
  if (array instanceof Int32Array) {
    return "Int32Array";
  }

  if (array instanceof Float32Array) {
    return "Float32Array";
  }

  return "Uint8Array";
}

function concatUint8Arrays(chunks) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let cursor = 0;

  for (const chunk of chunks) {
    merged.set(chunk, cursor);
    cursor += chunk.byteLength;
  }

  return merged;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
