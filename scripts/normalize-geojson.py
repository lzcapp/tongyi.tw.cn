#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""自动闭合 geojson/ 目录下未闭合的线性环。

用法:
    python3 scripts/normalize-geojson.py            # 闭合所有未闭合的线性环并写回
    python3 scripts/normalize-geojson.py --check    # 只检查，需要变更时退出码 1
    python3 scripts/normalize-geojson.py -v         # 输出每个被闭合的环的位置

行为:
  * 仅处理 Polygon / MultiPolygon 的线性环（LineString 不要求闭合，保持原样）；
  * 未闭合的环在环尾追加首坐标，其他几何与属性保持不变；
  * 只重写实际发生变化的文件，使用 4 空格缩进、ensure_ascii=False、文件末尾换行，
    未发生变化的文件不会被读取后重写（避免无谓的格式化 diff，如 ph.geojson 的浮点精度）；
  * 幂等：对已规范化的数据再次运行不会产生任何写入。

仅依赖 Python 标准库。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_GEOJSON_DIR = ROOT / "geojson"

INDENT = 4
TRAILING_NEWLINE = "\n"


class ChangeCounter:
    """统计一个文件内的闭合情况。"""

    __slots__ = ("closed", "skipped", "locations")

    def __init__(self) -> None:
        self.closed = 0
        self.skipped = 0
        self.locations: list[str] = []


def close_polygon_rings(
    rings: object,
    rel: str,
    where: str,
    counter: ChangeCounter,
    verbose: bool,
) -> bool:
    """闭合一个 Polygon 的所有线性环，返回是否有改动。"""
    if not isinstance(rings, list) or not rings:
        return False
    changed = False
    for index, ring in enumerate(rings):
        if not isinstance(ring, list) or not ring:
            continue
        if ring[0] == ring[-1]:
            continue  # 已闭合
        ring_where = "%s[%d]" % (where, index)
        if len(ring) < 3:
            # 追加首点后仍不足 4 个坐标，无法通过闭合修复，交给 validate 报错
            counter.skipped += 1
            print("  [WARN] %s: %s 只有 %d 个坐标，无法通过追加首点修复，请人工检查" % (rel, ring_where, len(ring)))
            continue
        ring.append(list(ring[0]))  # 在环尾追加首点，其余坐标不变
        counter.closed += 1
        counter.locations.append(ring_where)
        changed = True
        if verbose:
            print(
                "  [FIX] %s: %s 原为未闭合环（%d 个坐标），在环尾追加首点 -> %d 个坐标"
                % (rel, ring_where, len(ring) - 1, len(ring))
            )
    return changed


def close_geometry(
    geometry: object,
    rel: str,
    where: str,
    counter: ChangeCounter,
    verbose: bool,
) -> bool:
    """递归闭合 geometry 中的线性环，返回是否有改动。"""
    if not isinstance(geometry, dict):
        return False
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if gtype == "Polygon":
        return close_polygon_rings(coords, rel, where + ".coordinates", counter, verbose)
    if gtype == "MultiPolygon":
        if not isinstance(coords, list):
            return False
        changed = False
        for index, rings in enumerate(coords):
            if close_polygon_rings(rings, rel, "%s.coordinates[%d]" % (where, index), counter, verbose):
                changed = True
        return changed
    if gtype == "GeometryCollection":
        geometries = geometry.get("geometries")
        if not isinstance(geometries, list):
            return False
        changed = False
        for index, sub in enumerate(geometries):
            if close_geometry(sub, rel, "%s.geometries[%d]" % (where, index), counter, verbose):
                changed = True
        return changed
    return False


def normalize_file(
    path: Path,
    rel: str,
    verbose: bool,
    check_only: bool,
) -> tuple[bool, int, int]:
    """规范化单个文件。

    返回 (是否有改动, 闭合环数, 跳过环数)；有改动且非 check 模式时写回文件。
    解析失败时抛出 ValueError。
    """
    text = path.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("JSON 解析失败: %s（第 %d 行第 %d 列）" % (exc.msg, exc.lineno, exc.colno)) from exc

    counter = ChangeCounter()
    changed = False
    top_type = data.get("type") if isinstance(data, dict) else None
    if top_type == "FeatureCollection":
        features = data.get("features")
        if isinstance(features, list):
            for index, feature in enumerate(features):
                if isinstance(feature, dict):
                    geometry = feature.get("geometry")
                    if close_geometry(geometry, rel, "features[%d].geometry" % index, counter, verbose):
                        changed = True
    elif top_type == "Feature":
        if close_geometry(data.get("geometry"), rel, "geometry", counter, verbose):
            changed = True

    if changed and not check_only:
        # 4 空格缩进 + ensure_ascii=False + 末尾换行；写入前不改变其他文件内容格式
        new_text = json.dumps(data, indent=INDENT, ensure_ascii=False) + TRAILING_NEWLINE
        with open(path, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(new_text)
    return changed, counter.closed, counter.skipped


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="自动闭合 geojson/ 目录下未闭合的线性环（仅标准库）。",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="只检查不写入；存在需要闭合的环时退出码为 1",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="输出每个被闭合的环的位置",
    )
    parser.add_argument(
        "--geojson-dir",
        default=str(DEFAULT_GEOJSON_DIR),
        help="GeoJSON 数据目录（默认: 仓库根目录下的 geojson/）",
    )
    args = parser.parse_args(argv)

    geojson_dir = Path(args.geojson_dir)
    print("GeoJSON 规范化%s" % ("（--check 只检查，不写入）" if args.check else ""))
    print("数据目录: %s" % geojson_dir)
    print("=" * 72)

    if not geojson_dir.is_dir():
        print("  [ERROR] 数据目录不存在: %s" % geojson_dir)
        print("结果: 失败（数据目录不存在）")
        return 1

    files = sorted(geojson_dir.glob("*.geojson"))
    if not files:
        print("  [ERROR] 目录中未找到任何 *.geojson 文件: %s" % geojson_dir)
        print("结果: 失败（没有可规范化的数据文件）")
        return 1

    changed_files: list[tuple[str, int]] = []
    total_closed = 0
    total_skipped = 0
    failed_files = 0

    for path in files:
        try:
            rel = str(path.relative_to(ROOT))
        except ValueError:
            rel = path.name
        try:
            changed, closed, skipped = normalize_file(path, rel, args.verbose, args.check)
        except (OSError, ValueError) as exc:
            print("  [ERROR] %s: %s" % (rel, exc))
            failed_files += 1
            continue
        total_closed += closed
        total_skipped += skipped
        if changed:
            changed_files.append((rel, closed))
            action = "需要闭合" if args.check else "已闭合"
            print("  %s: %s %d 个线性环%s" % (rel, action, closed, "（--check 未写入）" if args.check else "，已重写文件"))

    print("-" * 72)
    print(
        "扫描 %d 个文件；本次%s %d 个线性环，涉及 %d 个文件"
        % (
            len(files),
            "需要闭合" if args.check else "闭合",
            total_closed,
            len(changed_files),
        )
    )
    if total_skipped:
        print("另有 %d 个环坐标数不足 3，无法自动闭合，请人工检查" % total_skipped)

    if failed_files:
        print("结果: 失败（%d 个文件处理失败，未变更的坏文件保持原样）" % failed_files)
        return 1

    if args.check:
        if changed_files:
            print("结果: 需要变更（--check 模式，未写入任何文件）")
            return 1
        print("结果: 无需变更（所有线性环均已闭合）")
        return 0

    if not changed_files:
        print("结果: 无需变更（所有线性环均已闭合，幂等）")
        return 0
    print("结果: 完成（已重写 %d 个文件，闭合 %d 个线性环）" % (len(changed_files), total_closed))
    return 0


if __name__ == "__main__":
    sys.exit(main())
