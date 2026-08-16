#!/usr/bin/env python3
"""Build the Drive Venture political map from Census boundaries and the versioned CSV."""
from __future__ import annotations

import csv
import html
import io
import math
import struct
import sys
import urllib.request
import zipfile
from pathlib import Path

CENSUS_ZIP = "https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_state_20m.zip"
CSV_PATH = Path(__file__).resolve().parents[1] / "staging" / "state-requirements.csv"
VALID = {"AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"}


def download_boundaries() -> tuple[bytes, bytes]:
    with urllib.request.urlopen(CENSUS_ZIP) as response:
        archive = zipfile.ZipFile(io.BytesIO(response.read()))
    shp = next(name for name in archive.namelist() if name.endswith(".shp"))
    dbf = next(name for name in archive.namelist() if name.endswith(".dbf"))
    return archive.read(shp), archive.read(dbf)


def parse_dbf(raw: bytes) -> list[dict[str, str]]:
    record_count = struct.unpack_from("<I", raw, 4)[0]
    header_len, record_len = struct.unpack_from("<HH", raw, 8)
    fields, pos = [], 32
    while raw[pos] != 0x0D:
        name = raw[pos:pos+11].split(b"\0",1)[0].decode("ascii")
        length = raw[pos+16]
        fields.append((name, length))
        pos += 32
    rows = []
    for i in range(record_count):
        record = raw[header_len+i*record_len:header_len+(i+1)*record_len]
        if not record or record[0:1] == b"*":
            continue
        cursor, row = 1, {}
        for name, length in fields:
            row[name] = record[cursor:cursor+length].decode("latin-1").strip()
            cursor += length
        rows.append(row)
    return rows


def parse_shapes(raw: bytes) -> list[list[list[tuple[float,float]]]]:
    shapes, pos = [], 100
    while pos + 8 <= len(raw):
        _, words = struct.unpack_from(">II", raw, pos)
        content = raw[pos+8:pos+8+words*2]
        pos += 8 + words*2
        if len(content) < 44 or struct.unpack_from("<I", content, 0)[0] not in (5,15,25):
            shapes.append([])
            continue
        n_parts, n_points = struct.unpack_from("<II", content, 36)
        parts = list(struct.unpack_from(f"<{n_parts}I", content, 44)) + [n_points]
        point_offset = 44 + n_parts*4
        points = [struct.unpack_from("<dd", content, point_offset+i*16) for i in range(n_points)]
        shapes.append([points[parts[i]:parts[i+1]] for i in range(n_parts)])
    return shapes


def project(abbr: str, lon: float, lat: float) -> tuple[float,float]:
    if abbr == "AK":
        if lon > 0: lon -= 360
        return 45 + (lon + 180) * 5.0, 555 + (72 - lat) * 6.4
    if abbr == "HI":
        return 345 + (lon + 161) * 24.0, 605 + (23 - lat) * 16.0
    return 45 + (lon + 125) * 17.4, 48 + (50 - lat) * 19.0


def path_data(abbr: str, parts: list[list[tuple[float,float]]]) -> str:
    commands = []
    for part in parts:
        if len(part) < 3: continue
        pts = [project(abbr, lon, lat) for lon, lat in part]
        commands.append("M" + " ".join(f"{x:.1f},{y:.1f}" for x,y in pts) + "Z")
    return " ".join(commands)


def main() -> None:
    data = {row["Abbreviation"]: row for row in csv.DictReader(CSV_PATH.open(encoding="utf-8"))}
    shp, dbf = download_boundaries()
    records, shapes = parse_dbf(dbf), parse_shapes(shp)
    paths = []
    for record, parts in zip(records, shapes):
        abbr = record.get("STUSPS", "")
        if abbr not in VALID: continue
        row = data[abbr]
        category = "supported" if row["CurrentSupport"].lower()=="true" else "exact50" if row["Exactly50Hours"].lower()=="true" else "other"
        documented = row["DocumentationCategory"] == "Detailed Log Required"
        hours = row["TotalHours"] or "no verified statewide minimum"
        night = f"; {row['NightHours']} night" if row["NightHours"] not in ("","0") else ""
        title = f"{row['State']} — {hours} supervised hours{night}; {row['DocumentationCategory']}."
        d = path_data(abbr, parts)
        outline = ' style="stroke:#2f7d4a;stroke-width:6"' if documented else ''
        paths.append(f'<g id="{abbr}" class="state {category}{" documented" if documented else ""}" role="img" aria-label="{html.escape(title)}"><title>{html.escape(title)}</title><path class="state-shape"{outline} d="{d}"/></g>')
    # D.C. is geographically tiny; keep the true boundary and add a visible callout marker.
    dcx,dcy = project("DC",-77.02,38.91)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 720" role="img" aria-labelledby="mapTitle mapDesc">
<title id="mapTitle">Drive Venture supervised-driving requirements political map</title>
<desc id="mapDesc">A geographic United States political map using Census Bureau state boundaries. Michigan is bright yellow as currently supported. Other exact-50-hour states are muted yellow. Other hour requirements are gray. A green inner stroke identifies states requiring a detailed driving log. Alaska and Hawaii appear as insets.</desc>
<style>.state-shape{{stroke:#080b0e;stroke-width:2.4;vector-effect:non-scaling-stroke;stroke-linejoin:round}}.supported .state-shape{{fill:#f4b820}}.exact50 .state-shape{{fill:#a58e49}}.other .state-shape{{fill:#626b73}}.documented .state-shape{{stroke:#2f7d4a;stroke-width:6}}.state:hover .state-shape{{stroke:#f7f3e8;stroke-width:5}}.inset{{fill:none;stroke:#aeb8c2;stroke-width:1.5;stroke-dasharray:7 6}}.label{{fill:#aeb8c2;font:700 15px Inter,Arial,sans-serif;letter-spacing:.08em}}.dc-marker{{fill:#626b73;stroke:#080b0e;stroke-width:2}}.dc-line{{stroke:#f7f3e8;stroke-width:1.5}}</style>
<rect width="1200" height="720" rx="18" fill="#111820"/>
<text x="40" y="35" fill="#f7f3e8" font-family="Orbitron,Arial,sans-serif" font-size="19" font-weight="800">U.S. SUPERVISED-DRIVING REQUIREMENTS • VERIFIED 2026-08-16</text>
<g>{''.join(paths)}</g>
<rect class="inset" x="28" y="545" width="292" height="155" rx="8"/><text class="label" x="42" y="687">ALASKA</text>
<rect class="inset" x="330" y="585" width="225" height="115" rx="8"/><text class="label" x="344" y="687">HAWAII</text>
<circle class="dc-marker" cx="{dcx:.1f}" cy="{dcy:.1f}" r="5"/><path class="dc-line" d="M{dcx+5:.1f},{dcy:.1f} l30,18"/><text class="label" x="{dcx+39:.1f}" y="{dcy+24:.1f}">DC</text>
<text x="875" y="680" text-anchor="middle" fill="#aeb8c2" font-family="Inter,Arial,sans-serif" font-size="13">Base color = supervised-hour category • Green border = detailed-log requirement</text>
<text x="875" y="699" text-anchor="middle" fill="#aeb8c2" font-family="Inter,Arial,sans-serif" font-size="13">Rules and pathways vary. Confirm current requirements with the state licensing agency.</text>
</svg>'''
    sys.stdout.write(svg)


if __name__ == "__main__":
    main()
