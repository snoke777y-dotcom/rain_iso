#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from struct import pack, unpack, unpack_from


FREESECT = 0xFFFFFFFF
ENDOFCHAIN = 0xFFFFFFFE
DEFAULT_RADIUS_M = 5000.0
DEFAULT_FALLBACK_NEIGHBOR_COUNT = 4
METER_PER_DEGREE_LAT = 111_320.0


@dataclass(frozen=True)
class StationRecord:
    station_id: str
    system_id: str
    station_name: str
    river_name: str
    basin_name: str
    longitude: float
    latitude: float
    station_location: str
    admin_division_code: str
    admin_authority: str
    admin_division_name: str
    station_level: str
    area_code: str
    source_row_index: int
    projected_x_m: float
    projected_y_m: float


class CompoundFileBinary:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.sector_size = 1 << unpack_from("<H", data, 30)[0]
        self.mini_sector_size = 1 << unpack_from("<H", data, 32)[0]
        self.num_fat_sectors = unpack_from("<I", data, 44)[0]
        self.first_dir_sector = unpack_from("<I", data, 48)[0]
        self.mini_stream_cutoff = unpack_from("<I", data, 56)[0]
        self.first_mini_fat_sector = unpack_from("<I", data, 60)[0]
        self.num_mini_fat_sectors = unpack_from("<I", data, 64)[0]
        self.first_difat_sector = unpack_from("<I", data, 68)[0]
        self.num_difat_sectors = unpack_from("<I", data, 72)[0]

        self.fat = self._read_fat()
        self.directory_entries = self._read_directory_entries()
        self.root_entry = next(
            entry for entry in self.directory_entries if entry["type"] == 5
        )
        self.root_stream = self._read_stream(self.root_entry)
        self.mini_fat = self._read_mini_fat()

    def _sector(self, sector_id: int) -> bytes:
        start = (sector_id + 1) * self.sector_size
        return self.data[start : start + self.sector_size]

    def _read_chain(
        self,
        start_sector_id: int,
        table: list[int],
        chunk_size: int,
        source: bytes | None = None,
    ) -> bytes:
        if start_sector_id in (FREESECT, ENDOFCHAIN):
            return b""

        stream = bytearray()
        sector_id = start_sector_id
        visited: set[int] = set()

        while sector_id not in (FREESECT, ENDOFCHAIN):
            if sector_id in visited:
                raise RuntimeError("compound file chain contains a cycle")
            visited.add(sector_id)

            if source is None:
                stream.extend(self._sector(sector_id))
            else:
                start = sector_id * chunk_size
                stream.extend(source[start : start + chunk_size])

            sector_id = table[sector_id]

        return bytes(stream)

    def _read_fat(self) -> list[int]:
        difat = [
            entry for entry in unpack_from("<109I", self.data, 76) if entry != FREESECT
        ]
        next_difat_sector = self.first_difat_sector

        for _ in range(self.num_difat_sectors):
            difat_sector = self._sector(next_difat_sector)
            difat_entry_count = self.sector_size // 4 - 1
            difat.extend(
                entry
                for entry in unpack_from(f"<{difat_entry_count}I", difat_sector, 0)
                if entry != FREESECT
            )
            next_difat_sector = unpack_from(
                "<I", difat_sector, self.sector_size - 4
            )[0]

        fat: list[int] = []
        for sector_id in difat[: self.num_fat_sectors]:
            fat.extend(unpack(f"<{self.sector_size // 4}I", self._sector(sector_id)))

        return fat

    def _read_directory_entries(self) -> list[dict[str, int | str]]:
        directory_stream = self._read_chain(
            self.first_dir_sector, self.fat, self.sector_size
        )
        entries: list[dict[str, int | str]] = []

        for offset in range(0, len(directory_stream), 128):
            entry = directory_stream[offset : offset + 128]
            if len(entry) < 128:
                break

            name_length = unpack_from("<H", entry, 64)[0]
            if name_length < 2:
                continue

            entries.append(
                {
                    "name": entry[: name_length - 2].decode(
                        "utf-16le", errors="ignore"
                    ),
                    "type": entry[66],
                    "start_sector_id": unpack_from("<I", entry, 116)[0],
                    "size": unpack_from("<Q", entry, 120)[0],
                }
            )

        return entries

    def _read_mini_fat(self) -> list[int]:
        if self.num_mini_fat_sectors == 0 or self.first_mini_fat_sector in (
            FREESECT,
            ENDOFCHAIN,
        ):
            return []

        mini_fat_stream = self._read_chain(
            self.first_mini_fat_sector, self.fat, self.sector_size
        )
        entry_count = len(mini_fat_stream) // 4
        return list(unpack(f"<{entry_count}I", mini_fat_stream[: entry_count * 4]))

    def _read_stream(self, entry: dict[str, int | str]) -> bytes:
        start_sector_id = int(entry["start_sector_id"])
        size = int(entry["size"])
        if size < self.mini_stream_cutoff and int(entry["type"]) == 2:
            return self._read_chain(
                start_sector_id,
                self.mini_fat,
                self.mini_sector_size,
                self.root_stream,
            )[:size]

        return self._read_chain(start_sector_id, self.fat, self.sector_size)[:size]

    def open_stream(self, name: str) -> bytes:
        entry = next(entry for entry in self.directory_entries if entry["name"] == name)
        return self._read_stream(entry)


def iter_biff_records(blob: bytes, start: int = 0):
    position = start
    while position + 4 <= len(blob):
        record_id, record_length = unpack_from("<HH", blob, position)
        payload = blob[position + 4 : position + 4 + record_length]
        yield position, record_id, payload
        position += 4 + record_length


def decode_rk(rk_value: int) -> float:
    if rk_value & 0x2:
        value = rk_value >> 2
    else:
        value = unpack("<d", pack("<Q", (rk_value & 0xFFFFFFFC) << 32))[0]

    if rk_value & 0x1:
        value /= 100

    return float(value)


def parse_shared_strings(workbook_blob: bytes, sst_offset: int) -> list[str]:
    position = sst_offset
    record_id, record_length = unpack_from("<HH", workbook_blob, position)
    if record_id != 0x00FC:
        raise RuntimeError("invalid SST record offset")

    parts = [workbook_blob[position + 4 : position + 4 + record_length]]
    position += 4 + record_length

    while position + 4 <= len(workbook_blob):
        next_record_id, next_record_length = unpack_from("<HH", workbook_blob, position)
        if next_record_id != 0x003C:
            break
        parts.append(workbook_blob[position + 4 : position + 4 + next_record_length])
        position += 4 + next_record_length

    unique_string_count = unpack_from("<I", parts[0], 4)[0]
    part_index = 0
    data = parts[part_index]
    data_length = len(data)
    offset = 8
    strings: list[str] = []

    for _ in range(unique_string_count):
        while offset >= data_length:
            part_index += 1
            if part_index >= len(parts):
                return strings
            data = parts[part_index]
            data_length = len(data)
            offset = 0

        if offset + 3 > data_length:
            break

        char_count = unpack_from("<H", data, offset)[0]
        offset += 2
        flags = data[offset]
        offset += 1

        is_utf16 = flags & 0x1
        has_rich_text = flags & 0x8
        has_extended_info = flags & 0x4

        rich_text_run_count = unpack_from("<H", data, offset)[0] if has_rich_text else 0
        if has_rich_text:
            offset += 2

        extended_info_size = (
            unpack_from("<I", data, offset)[0] if has_extended_info else 0
        )
        if has_extended_info:
            offset += 4

        fragments: list[str] = []
        chars_decoded = 0
        encoding = "utf-16le" if is_utf16 else "latin1"

        while chars_decoded < char_count:
            chars_needed = char_count - chars_decoded
            if is_utf16:
                chars_available = min((data_length - offset) >> 1, chars_needed)
                raw = data[offset : offset + chars_available * 2]
                offset += chars_available * 2
            else:
                chars_available = min(data_length - offset, chars_needed)
                raw = data[offset : offset + chars_available]
                offset += chars_available

            fragments.append(raw.decode(encoding, errors="ignore"))
            chars_decoded += chars_available

            if chars_decoded == char_count:
                break

            part_index += 1
            if part_index >= len(parts):
                return strings

            data = parts[part_index]
            data_length = len(data)
            if data_length == 0:
                return strings

            is_utf16 = bool(data[0] & 0x1)
            encoding = "utf-16le" if is_utf16 else "latin1"
            offset = 1

        strings.append("".join(fragments))

        for _ in range(rich_text_run_count):
            if offset == data_length:
                part_index += 1
                if part_index >= len(parts):
                    return strings
                data = parts[part_index]
                data_length = len(data)
                offset = 0
            offset += 4

        offset += extended_info_size
        while offset >= data_length and part_index + 1 < len(parts):
            offset -= data_length
            part_index += 1
            data = parts[part_index]
            data_length = len(data)

    return strings


def parse_first_sheet_rows(xls_path: Path) -> list[list[object]]:
    compound = CompoundFileBinary(xls_path.read_bytes())
    workbook_blob = compound.open_stream("Workbook")

    first_sheet_offset: int | None = None
    shared_string_table_offset: int | None = None

    for position, record_id, payload in iter_biff_records(workbook_blob):
        if record_id == 0x0085 and first_sheet_offset is None:
            first_sheet_offset = unpack_from("<I", payload, 0)[0]
        elif record_id == 0x00FC and shared_string_table_offset is None:
            shared_string_table_offset = position

        if first_sheet_offset is not None and shared_string_table_offset is not None:
            break

    if first_sheet_offset is None:
        raise RuntimeError("first worksheet was not found in workbook")
    if shared_string_table_offset is None:
        raise RuntimeError("shared string table was not found in workbook")

    shared_strings = parse_shared_strings(workbook_blob, shared_string_table_offset)
    cells: dict[tuple[int, int], object] = {}

    for _, record_id, payload in iter_biff_records(workbook_blob, first_sheet_offset):
        if record_id == 0x000A:
            break

        if record_id == 0x00FD:
            row_index, col_index, _, sst_index = unpack_from("<HHHI", payload, 0)
            cells[(row_index, col_index)] = (
                shared_strings[sst_index] if sst_index < len(shared_strings) else ""
            )
        elif record_id == 0x0203:
            row_index, col_index = unpack_from("<HH", payload, 0)
            cells[(row_index, col_index)] = unpack_from("<d", payload, 6)[0]
        elif record_id == 0x027E:
            row_index, col_index = unpack_from("<HH", payload, 0)
            cells[(row_index, col_index)] = decode_rk(unpack_from("<I", payload, 6)[0])
        elif record_id == 0x00BD:
            row_index, first_col_index = unpack_from("<HH", payload, 0)
            last_col_index = unpack_from("<H", payload, len(payload) - 2)[0]
            offset = 4
            for col_index in range(first_col_index, last_col_index + 1):
                rk_value = unpack_from("<I", payload, offset + 2)[0]
                cells[(row_index, col_index)] = decode_rk(rk_value)
                offset += 6
        elif record_id == 0x0204:
            row_index, col_index, _, text_length = unpack_from("<HHHH", payload, 0)
            cells[(row_index, col_index)] = payload[8 : 8 + text_length].decode(
                "latin1", errors="ignore"
            )

    if not cells:
        raise RuntimeError("worksheet does not contain readable cell data")

    max_row_index = max(row for row, _ in cells)
    max_col_index = max(col for _, col in cells)
    rows: list[list[object]] = []

    for row_index in range(max_row_index + 1):
        rows.append(
            [cells.get((row_index, col_index), "") for col_index in range(max_col_index + 1)]
        )

    return rows


def build_station_records(rows: list[list[object]]) -> tuple[list[StationRecord], int, int]:
    headers = [str(value).strip() for value in rows[0]]
    column_index = {header: index for index, header in enumerate(headers)}
    required_headers = [
        "SYSID",
        "STCD",
        "STNM",
        "RVNM",
        "HNNM",
        "LGTD",
        "LTTD",
        "STLC",
        "ADDVCD",
        "ADMAUTH",
        "addvnm",
        "STLVL",
        "AREA",
    ]

    missing_headers = [header for header in required_headers if header not in column_index]
    if missing_headers:
        raise RuntimeError(f"worksheet headers missing: {', '.join(missing_headers)}")

    latitudes: list[float] = []
    for row in rows[1:]:
        station_id = str(row[column_index["STCD"]]).strip()
        latitude_raw = row[column_index["LTTD"]]
        longitude_raw = row[column_index["LGTD"]]
        if not station_id or latitude_raw in ("", None) or longitude_raw in ("", None):
            continue
        try:
            latitudes.append(float(latitude_raw))
        except (TypeError, ValueError):
            continue

    if not latitudes:
        raise RuntimeError("worksheet does not contain any stations with valid coordinates")
    reference_latitude = sum(latitudes) / len(latitudes)
    meter_per_degree_lon = METER_PER_DEGREE_LAT * math.cos(
        math.radians(reference_latitude)
    )

    stations: list[StationRecord] = []
    seen_station_ids: set[str] = set()
    duplicate_station_id_count = 0
    skipped_missing_coordinate_count = 0

    for row_index, row in enumerate(rows[1:], start=1):
        station_id = str(row[column_index["STCD"]]).strip()
        if not station_id:
            continue

        if station_id in seen_station_ids:
            duplicate_station_id_count += 1
            continue
        seen_station_ids.add(station_id)

        longitude_raw = row[column_index["LGTD"]]
        latitude_raw = row[column_index["LTTD"]]
        if longitude_raw in ("", None) or latitude_raw in ("", None):
            skipped_missing_coordinate_count += 1
            continue

        try:
            longitude = float(longitude_raw)
            latitude = float(latitude_raw)
        except (TypeError, ValueError):
            skipped_missing_coordinate_count += 1
            continue

        stations.append(
            StationRecord(
                station_id=station_id,
                system_id=str(row[column_index["SYSID"]]).strip(),
                station_name=str(row[column_index["STNM"]]).strip(),
                river_name=str(row[column_index["RVNM"]]).strip(),
                basin_name=str(row[column_index["HNNM"]]).strip(),
                longitude=longitude,
                latitude=latitude,
                station_location=str(row[column_index["STLC"]]).strip(),
                admin_division_code=str(row[column_index["ADDVCD"]]).strip(),
                admin_authority=str(row[column_index["ADMAUTH"]]).strip(),
                admin_division_name=str(row[column_index["addvnm"]]).strip(),
                station_level=str(row[column_index["STLVL"]]).strip(),
                area_code=str(row[column_index["AREA"]]).strip(),
                source_row_index=row_index,
                projected_x_m=longitude * meter_per_degree_lon,
                projected_y_m=latitude * METER_PER_DEGREE_LAT,
            )
        )

    stations.sort(key=lambda station: station.station_id)
    return stations, duplicate_station_id_count, skipped_missing_coordinate_count


def build_spatial_index(
    stations: list[StationRecord], cell_size_m: float
) -> dict[tuple[int, int], list[int]]:
    index: dict[tuple[int, int], list[int]] = {}
    for station_index, station in enumerate(stations):
        cell = (
            math.floor(station.projected_x_m / cell_size_m),
            math.floor(station.projected_y_m / cell_size_m),
        )
        index.setdefault(cell, []).append(station_index)
    return index


def haversine_distance_m(left: StationRecord, right: StationRecord) -> float:
    earth_radius_m = 6_371_000.0
    delta_lat = math.radians(right.latitude - left.latitude)
    delta_lon = math.radians(right.longitude - left.longitude)
    left_lat = math.radians(left.latitude)
    right_lat = math.radians(right.latitude)
    haversine = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(left_lat) * math.cos(right_lat) * math.sin(delta_lon / 2) ** 2
    )
    return 2 * earth_radius_m * math.asin(math.sqrt(haversine))


def distance_to_outside_of_covered_square(
    station: StationRecord, cell_x: int, cell_y: int, ring_radius: int, cell_size_m: float
) -> float:
    min_x = (cell_x - ring_radius) * cell_size_m
    max_x = (cell_x + ring_radius + 1) * cell_size_m
    min_y = (cell_y - ring_radius) * cell_size_m
    max_y = (cell_y + ring_radius + 1) * cell_size_m

    dx = min(station.projected_x_m - min_x, max_x - station.projected_x_m)
    dy = min(station.projected_y_m - min_y, max_y - station.projected_y_m)
    return min(dx, dy)


def build_neighbor_relations(
    stations: list[StationRecord],
    radius_m: float,
    fallback_neighbor_count: int,
) -> list[dict[str, object]]:
    spatial_index = build_spatial_index(stations, radius_m)
    relations: list[dict[str, object]] = []

    for station in stations:
        cell_x = math.floor(station.projected_x_m / radius_m)
        cell_y = math.floor(station.projected_y_m / radius_m)

        neighbor_candidates: list[tuple[StationRecord, float]] = []
        fallback_candidates: dict[str, tuple[StationRecord, float]] = {}
        visited_cells: set[tuple[int, int]] = set()

        def collect_from_cell(target_cell_x: int, target_cell_y: int) -> None:
            target_cell = (target_cell_x, target_cell_y)
            if target_cell in visited_cells:
                return
            visited_cells.add(target_cell)

            for candidate_index in spatial_index.get(target_cell, []):
                candidate = stations[candidate_index]
                if candidate.station_id == station.station_id:
                    continue

                distance_m = haversine_distance_m(station, candidate)
                existing = fallback_candidates.get(candidate.station_id)
                if existing is None or distance_m < existing[1]:
                    fallback_candidates[candidate.station_id] = (candidate, distance_m)

                if distance_m <= radius_m:
                    neighbor_candidates.append((candidate, distance_m))

        for target_cell_x in range(cell_x - 1, cell_x + 2):
            for target_cell_y in range(cell_y - 1, cell_y + 2):
                collect_from_cell(target_cell_x, target_cell_y)

        ring_radius = 1
        while True:
            sorted_fallback = sorted(
                fallback_candidates.values(), key=lambda item: item[1]
            )
            if len(sorted_fallback) >= fallback_neighbor_count:
                worst_distance = sorted_fallback[fallback_neighbor_count - 1][1]
                lower_bound = distance_to_outside_of_covered_square(
                    station, cell_x, cell_y, ring_radius, radius_m
                )
                if worst_distance <= lower_bound:
                    break

            ring_radius += 1
            if ring_radius > 512:
                break

            for target_cell_x in range(cell_x - ring_radius, cell_x + ring_radius + 1):
                collect_from_cell(target_cell_x, cell_y - ring_radius)
                collect_from_cell(target_cell_x, cell_y + ring_radius)
            for target_cell_y in range(cell_y - ring_radius + 1, cell_y + ring_radius):
                collect_from_cell(cell_x - ring_radius, target_cell_y)
                collect_from_cell(cell_x + ring_radius, target_cell_y)

        neighbors_within_5km = [
            {"station_id": candidate.station_id, "distance_m": round(distance_m, 3)}
            for candidate, distance_m in sorted(
                neighbor_candidates, key=lambda item: (item[1], item[0].station_id)
            )
        ]

        fallback_nearest_neighbors = [
            {"station_id": candidate.station_id, "distance_m": round(distance_m, 3)}
            for candidate, distance_m in sorted(
                fallback_candidates.values(),
                key=lambda item: (item[1], item[0].station_id),
            )[:fallback_neighbor_count]
        ]

        relations.append(
            {
                "station_id": station.station_id,
                "neighbors_within_5km": neighbors_within_5km,
                "neighbor_count_within_5km": len(neighbors_within_5km),
                "fallback_nearest_neighbors": fallback_nearest_neighbors,
            }
        )

    return relations


def write_json(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate rain station dictionary and 5km neighbor relations from a .xls station list."
    )
    parser.add_argument("--input", required=True, help="Path to the source .xls file.")
    parser.add_argument(
        "--stations-out", required=True, help="Path to write the station dictionary JSON."
    )
    parser.add_argument(
        "--relations-out",
        required=True,
        help="Path to write the station neighbor relations JSON.",
    )
    parser.add_argument(
        "--radius-m",
        type=float,
        default=DEFAULT_RADIUS_M,
        help="Neighbor search radius in meters. Defaults to 5000.",
    )
    parser.add_argument(
        "--fallback-neighbor-count",
        type=int,
        default=DEFAULT_FALLBACK_NEIGHBOR_COUNT,
        help="How many nearest fallback neighbors to keep per station. Defaults to 4.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    station_rows = parse_first_sheet_rows(input_path)
    (
        stations,
        duplicate_station_id_count,
        skipped_missing_coordinate_count,
    ) = build_station_records(station_rows)
    relations = build_neighbor_relations(
        stations,
        radius_m=float(args.radius_m),
        fallback_neighbor_count=int(args.fallback_neighbor_count),
    )

    write_json(
        Path(args.stations_out),
        {
            "source_file": input_path.as_posix(),
            "sheet_name": "雨量站列表查询",
            "station_count": len(stations),
            "duplicate_station_id_count": duplicate_station_id_count,
            "skipped_missing_coordinate_count": skipped_missing_coordinate_count,
            "stations": [
                {
                    "station_id": station.station_id,
                    "system_id": station.system_id,
                    "station_name": station.station_name,
                    "river_name": station.river_name,
                    "basin_name": station.basin_name,
                    "longitude": station.longitude,
                    "latitude": station.latitude,
                    "station_location": station.station_location,
                    "admin_division_code": station.admin_division_code,
                    "admin_authority": station.admin_authority,
                    "admin_division_name": station.admin_division_name,
                    "station_level": station.station_level,
                    "area_code": station.area_code,
                    "source_row_index": station.source_row_index,
                }
                for station in stations
            ],
        },
    )

    write_json(
        Path(args.relations_out),
        {
            "source_file": input_path.as_posix(),
            "radius_m": float(args.radius_m),
            "fallback_neighbor_count": int(args.fallback_neighbor_count),
            "station_count": len(stations),
            "relations": relations,
        },
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
