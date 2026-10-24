#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 geojson/ 目录下的 GeoJSON 数据文件。

用法:
    python3 scripts/validate-geojson.py            # 校验并输出报告
    python3 scripts/validate-geojson.py -v         # 额外输出逐文件统计

校验内容:
  * JSON 可解析；顶层 type 为 Feature 或 FeatureCollection；features 非空；
  * geometry 类型合法（Point/MultiPoint/LineString/MultiLineString/Polygon/
    MultiPolygon/GeometryCollection），坐标结构正确；
  * Polygon/MultiPolygon 的线性环闭合（坐标数 >= 4 且首尾坐标相等）；
  * 坐标为有限数值且落在 WGS84 范围内（经度 -180~180、纬度 -90~90）；
  * 坐标超出台湾周边合理范围（经度 100~150、纬度 0~50）只输出 warning，
    不视为 error（已知 geojson/rcr_m.geojson 经度约 12.x，疑似漏写 "12"）；
  * 若 src/app.js 已存在，检查其中 ./geojson/xxx.geojson 引用的文件存在，
    缺失只输出 warning。

存在 error 时退出码为 1，否则为 0（warning 不影响退出码）。
仅依赖 Python 标准库。
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_GEOJSON_DIR = ROOT / "geojson"
APP_JS = ROOT / "src" / "app.js"

# 合法 WGS84 经纬度范围
WGS84_LON = (-180.0, 180.0)
WGS84_LAT = (-90.0, 90.0)
# 台湾周边合理范围（仅用于 warning）
TW_LON = (100.0, 150.0)
TW_LAT = (0.0, 50.0)

GEOMETRY_TYPES = {
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
    "GeometryCollection",
}
# 明细最多展开条数（按文件分别计数），避免坏数据刷屏
MAX_DETAILS = 20
MAX_GEOMETRY_NESTING = 8


class Report:
    """收集 error / warning 明细。"""

    def __init__(self) -> None:
        self.errors: list[tuple[str, str]] = []
        self.warnings: list[tuple[str, str]] = []

    def error(self, rel: str, message: str) -> None:
        self.errors.append((rel, message))

    def warning(self, rel: str, message: str) -> None:
        self.warnings.append((rel, message))


class FileStats:
    """单个文件的统计信息。"""

    __slots__ = ("features", "positions", "rings", "unclosed", "geom_types", "out_of_region", "out_samples")

    def __init__(self) -> None:
        self.features = 0
        self.positions = 0
        self.rings = 0
        self.unclosed = 0
        self.geom_types: Counter[str] = Counter()
        self.out_of_region = 0
        self.out_samples: list[tuple[float, float]] = []


def fmt_num(value: float) -> str:
    """紧凑地显示数值（保留 JSON 中的有效精度）。"""
    return repr(value)


def check_position(
    pos: object,
    rel: str,
    where: str,
    report: Report,
    stats: FileStats,
) -> bool:
    """校验一个坐标（[经度, 纬度] 或 [经度, 纬度, 高程]）。"""
    if not isinstance(pos, list):
        report.error(rel, "%s: 坐标应为数组，实际为 %s" % (where, type(pos).__name__))
        return False
    if len(pos) < 2:
        report.error(rel, "%s: 坐标至少需要 2 个数值（经度、纬度），实际 %d 个" % (where, len(pos)))
        return False
    for index, value in enumerate(pos):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            report.error(rel, "%s[%d]: 坐标分量应为数值，实际为 %r" % (where, index, value))
            return False
        if not math.isfinite(float(value)):
            report.error(rel, "%s[%d]: 坐标分量不是有限数值（%r）" % (where, index, value))
            return False

    lon = float(pos[0])
    lat = float(pos[1])
    stats.positions += 1

    problems = []
    if not WGS84_LON[0] <= lon <= WGS84_LON[1]:
        problems.append("经度 %s 超出 WGS84 范围 [-180, 180]" % fmt_num(lon))
    if not WGS84_LAT[0] <= lat <= WGS84_LAT[1]:
        problems.append("纬度 %s 超出 WGS84 范围 [-90, 90]" % fmt_num(lat))
    if problems:
        report.error(rel, "%s: %s" % (where, "；".join(problems)))
        return False

    # 合法但不在台湾周边范围: 只警告，不修改数据
    if not (TW_LON[0] <= lon <= TW_LON[1] and TW_LAT[0] <= lat <= TW_LAT[1]):
        stats.out_of_region += 1
        if len(stats.out_samples) < 3:
            stats.out_samples.append((lon, lat))
    return True


def check_ring(
    ring: object,
    rel: str,
    where: str,
    report: Report,
    stats: FileStats,
) -> None:
    """校验一个线性环（Polygon 的外环或内环）。"""
    if not isinstance(ring, list) or not ring:
        report.error(rel, "%s: 线性环应为非空坐标数组" % where)
        return
    stats.rings += 1
    is_closed = ring[0] == ring[-1]
    if not is_closed:
        stats.unclosed += 1
        report.error(
            rel,
            "%s: 线性环未闭合（首坐标 %r != 尾坐标 %r）"
            % (where, ring[0], ring[-1]),
        )
    if len(ring) < 4:
        report.error(rel, "%s: 线性环坐标数 %d < 4（闭合环至少 4 个坐标）" % (where, len(ring)))
    for index, pos in enumerate(ring):
        check_position(pos, rel, "%s[%d]" % (where, index), report, stats)


def check_linestring(
    line: object,
    rel: str,
    where: str,
    report: Report,
    stats: FileStats,
) -> None:
    """校验一条 LineString（不要求闭合，但至少 2 个坐标）。"""
    if not isinstance(line, list) or not line:
        report.error(rel, "%s: LineString 应为非空坐标数组" % where)
        return
    if len(line) < 2:
        report.error(rel, "%s: LineString 至少需要 2 个坐标，实际 %d 个" % (where, len(line)))
    for index, pos in enumerate(line):
        check_position(pos, rel, "%s[%d]" % (where, index), report, stats)


def check_polygon(
    rings: object,
    rel: str,
    where: str,
    report: Report,
    stats: FileStats,
) -> None:
    if not isinstance(rings, list) or not rings:
        report.error(rel, "%s: Polygon coordinates 应为非空线性环数组" % where)
        return
    for index, ring in enumerate(rings):
        check_ring(ring, rel, "%s[%d]" % (where, index), report, stats)


def check_multipolygon(
    polygons: object,
    rel: str,
    where: str,
    report: Report,
    stats: FileStats,
) -> None:
    if not isinstance(polygons, list) or not polygons:
        report.error(rel, "%s: MultiPolygon coordinates 应为非空数组" % where)
        return
    for index, rings in enumerate(polygons):
        check_polygon(rings, rel, "%s[%d]" % (where, index), report, stats)


def walk_geometry(
    geometry: object,
    rel: str,
    where: str,
    report: Report,
    stats: FileStats,
    depth: int = 0,
) -> None:
    """递归校验一个 geometry 对象。"""
    if depth > MAX_GEOMETRY_NESTING:
        report.error(rel, "%s: GeometryCollection 嵌套层级过深（> %d）" % (where, MAX_GEOMETRY_NESTING))
        return
    if not isinstance(geometry, dict):
        report.error(rel, "%s: geometry 应为 JSON 对象，实际为 %s" % (where, type(geometry).__name__))
        return
    gtype = geometry.get("type")
    if gtype not in GEOMETRY_TYPES:
        report.error(rel, "%s: 非法 geometry 类型 %r" % (where, gtype))
        return
    stats.geom_types[gtype] += 1

    if gtype == "GeometryCollection":
        geoms = geometry.get("geometries")
        if not isinstance(geoms, list) or not geoms:
            report.error(rel, "%s: GeometryCollection 的 geometries 缺失或为空" % where)
            return
        for index, sub in enumerate(geoms):
            walk_geometry(sub, rel, "%s.geometries[%d]" % (where, index), report, stats, depth + 1)
        return

    coords = geometry.get("coordinates")
    if coords is None:
        report.error(rel, "%s: %s 缺少 coordinates" % (where, gtype))
        return
    if gtype == "Point":
        check_position(coords, rel, "%s.coordinates" % where, report, stats)
    elif gtype == "MultiPoint":
        if not isinstance(coords, list) or not coords:
            report.error(rel, "%s: MultiPoint coordinates 应为非空数组" % where)
            return
        for index, pos in enumerate(coords):
            check_position(pos, rel, "%s.coordinates[%d]" % (where, index), report, stats)
    elif gtype == "LineString":
        check_linestring(coords, rel, "%s.coordinates" % where, report, stats)
    elif gtype == "MultiLineString":
        if not isinstance(coords, list) or not coords:
            report.error(rel, "%s: MultiLineString coordinates 应为非空数组" % where)
            return
        for index, line in enumerate(coords):
            check_linestring(line, rel, "%s.coordinates[%d]" % (where, index), report, stats)
    elif gtype == "Polygon":
        check_polygon(coords, rel, "%s.coordinates" % where, report, stats)
    elif gtype == "MultiPolygon":
        check_multipolygon(coords, rel, "%s.coordinates" % where, report, stats)


def validate_feature(feature: object, rel: str, prefix: str, report: Report, stats: FileStats) -> None:
    """校验一个 Feature。prefix 形如 'features[0].' 或 ''。"""
    if not isinstance(feature, dict):
        report.error(rel, "%s: Feature 应为 JSON 对象" % (prefix or "顶层"))
        return
    if feature.get("type") != "Feature":
        report.error(rel, "%s: 成员 type 应为 'Feature'，实际为 %r" % (prefix or "顶层", feature.get("type")))
        return
    if "geometry" not in feature:
        report.error(rel, "%sgeometry: Feature 缺少 geometry 字段" % prefix)
        return
    geometry = feature["geometry"]
    if geometry is None:
        report.error(rel, "%sgeometry: geometry 为 null（地图数据文件不应包含空几何）" % prefix)
        return
    walk_geometry(geometry, rel, prefix + "geometry", report, stats)


def validate_file(path: Path, rel: str, report: Report) -> FileStats:
    """校验单个 geojson 文件，返回其统计信息。"""
    stats = FileStats()
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        report.error(rel, "无法读取文件: %s" % exc)
        return stats
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        report.error(rel, "JSON 解析失败: %s（第 %d 行第 %d 列）" % (exc.msg, exc.lineno, exc.colno))
        return stats
    if not isinstance(data, dict):
        report.error(rel, "顶层应为 JSON 对象，实际为 %s" % type(data).__name__)
        return stats

    top_type = data.get("type")
    if top_type == "FeatureCollection":
        features = data.get("features")
        if not isinstance(features, list) or not features:
            report.error(rel, "FeatureCollection 的 features 缺失或为空（至少需要 1 个 Feature）")
            return stats
        stats.features = len(features)
        for index, feature in enumerate(features):
            validate_feature(feature, rel, "features[%d]." % index, report, stats)
    elif top_type == "Feature":
        stats.features = 1
        validate_feature(data, rel, "", report, stats)
    else:
        report.error(rel, "顶层 type 必须为 'Feature' 或 'FeatureCollection'，实际为 %r" % top_type)
        return stats

    if stats.out_of_region:
        samples = "、".join("(%s, %s)" % (fmt_num(lon), fmt_num(lat)) for lon, lat in stats.out_samples)
        report.warning(
            rel,
            "%d 个坐标超出台湾周边范围（经度 %g~%g、纬度 %g~%g），仅警告不改数据，示例: %s"
            % (
                stats.out_of_region,
                TW_LON[0],
                TW_LON[1],
                TW_LAT[0],
                TW_LAT[1],
                samples,
            ),
        )
    return stats


def check_app_js_references(report: Report) -> str:
    """检查 src/app.js 中引用的 geojson 文件是否存在，返回摘要文本。"""
    if not APP_JS.exists():
        return "src/app.js 不存在，跳过 geojson 引用检查"
    try:
        text = APP_JS.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        report.warning("src/app.js", "无法读取: %s" % exc)
        return "src/app.js 读取失败"
    refs = sorted(set(re.findall(r"geojson/[A-Za-z0-9_.\-]+\.geojson", text)))
    missing = [ref for ref in refs if not (ROOT / ref).is_file()]
    for ref in missing:
        report.warning("src/app.js", "引用的 geojson 文件不存在: %s" % ref)
    return "src/app.js: 引用 %d 个 geojson 文件，缺失 %d 个" % (len(refs), len(missing))


def print_details(title: str, items: list[tuple[str, str]], tag: str) -> None:
    """按文件分组打印明细，单个文件最多展开 MAX_DETAILS 条。"""
    if not items:
        return
    by_file: dict[str, list[str]] = {}
    for rel, message in items:
        by_file.setdefault(rel, []).append(message)
    print("%s:" % title)
    for rel, messages in by_file.items():
        for message in messages[:MAX_DETAILS]:
            print("  [%s] %s: %s" % (tag, rel, message))
        if len(messages) > MAX_DETAILS:
            print("  [%s] %s: ……另有 %d 条同类问题未展开" % (tag, rel, len(messages) - MAX_DETAILS))


def format_geom_types(counter: Counter[str]) -> str:
    if not counter:
        return "无"
    return ", ".join("%s×%d" % (name, counter[name]) for name in sorted(counter))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="校验 geojson/ 目录下的 GeoJSON 数据文件（仅标准库）。",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="输出每个文件的逐文件统计",
    )
    parser.add_argument(
        "--geojson-dir",
        default=str(DEFAULT_GEOJSON_DIR),
        help="GeoJSON 数据目录（默认: 仓库根目录下的 geojson/）",
    )
    args = parser.parse_args(argv)

    geojson_dir = Path(args.geojson_dir)
    print("GeoJSON 校验")
    print("数据目录: %s" % geojson_dir)
    print("=" * 72)

    if not geojson_dir.is_dir():
        print("  [ERROR] 数据目录不存在: %s" % geojson_dir)
        print("结果: 失败（数据目录不存在）")
        return 1

    files = sorted(geojson_dir.glob("*.geojson"))
    if not files:
        print("  [ERROR] 目录中未找到任何 *.geojson 文件: %s" % geojson_dir)
        print("结果: 失败（没有可校验的数据文件）")
        return 1

    report = Report()
    results: list[tuple[str, FileStats, int, int]] = []
    for path in files:
        try:
            rel = str(path.relative_to(ROOT))
        except ValueError:
            rel = path.name
        errors_before = len(report.errors)
        warnings_before = len(report.warnings)
        stats = validate_file(path, rel, report)
        results.append((rel, stats, len(report.errors) - errors_before, len(report.warnings) - warnings_before))

    if args.verbose:
        print("逐文件统计:")
        for rel, stats, error_count, warning_count in results:
            status = "FAIL" if error_count else ("WARN" if warning_count else "ok  ")
            print(
                "  %s %-22s features=%-3d positions=%-6d rings=%-3d unclosed=%-2d geom=%s"
                % (
                    status,
                    rel.split("/", 1)[-1] if "/" in rel else rel,
                    stats.features,
                    stats.positions,
                    stats.rings,
                    stats.unclosed,
                    format_geom_types(stats.geom_types),
                )
            )
        print("-" * 72)

    # 先做引用检查，使其产生的 warning 一并进入下方明细与统计
    ref_summary = check_app_js_references(report)

    print_details("错误明细", report.errors, "ERROR")
    print_details("警告明细", report.warnings, "WARNING")
    if report.errors or report.warnings:
        print("-" * 72)

    total_features = sum(stats.features for _, stats, _, _ in results)
    total_positions = sum(stats.positions for _, stats, _, _ in results)
    total_rings = sum(stats.rings for _, stats, _, _ in results)
    total_unclosed = sum(stats.unclosed for _, stats, _, _ in results)
    geom_counter: Counter[str] = Counter()
    for _, stats, _, _ in results:
        geom_counter.update(stats.geom_types)

    print("统计摘要:")
    print("  扫描文件        : %d 个" % len(results))
    print("  Feature         : %d 个" % total_features)
    print("  坐标点          : %d 个" % total_positions)
    print(
        "  线性环          : %d 个（已闭合 %d，未闭合 %d）"
        % (total_rings, total_rings - total_unclosed, total_unclosed)
    )
    print("  几何类型        : %s" % format_geom_types(geom_counter))
    print("  引用检查        : %s" % ref_summary)
    print("  错误 / 警告     : %d / %d" % (len(report.errors), len(report.warnings)))

    if report.errors:
        print("结果: 失败（%d 个 error，%d 个 warning）" % (len(report.errors), len(report.warnings)))
        return 1
    print("结果: 通过（0 个 error，%d 个 warning）" % len(report.warnings))
    return 0


if __name__ == "__main__":
    sys.exit(main())
