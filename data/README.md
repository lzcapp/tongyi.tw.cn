# uav_zone_tw.geojson

DroneMapTW（<https://dronemap.boggy.tw/>）公开矢量瓦片图层 `uav_zone` 的全台导出。

## 文件

| 文件 | 说明 |
| --- | --- |
| `uav_zone_tw.geojson` | WGS84 / OGC:CRS84，全量**面**要素（5,177 个，不含线边界） |
| `uav_zone_tw.geojson.gz` | 同一文件的 gzip 压缩版（1.56 MB） |
| `uav_zone_tw.stats.json` | 导出统计（分类、机关、bbox、文件大小） |
| `uav_zone_tw_restrictions.geojson` | **仅禁限航区**（禁止/限制），已按几何去重（5,016 个要素） |
| `uav_zone_tw_restrictions.geojson.gz` | 上述文件的 gzip 压缩版（1.4 MB） |
| `uav_zone_tw_restrictions.stats.json` | 飞行限制版本统计 |
| `uav_zone_red.geojson` | 台湾地区禁止区域（4,756 个，去重后，不含公路、铁路） |
| `uav_zone_yellow.geojson` | 台湾地区限制区域（122 个，去重后） |
| `uav_zone_highways.geojson` | 台湾地区公路（92 个） |
| `uav_zone_railways.geojson` | 台湾地区铁路（高铁，46 个） |
| `uav_zone_national_parks.geojson` | 台湾地区国家公园（66 个） |
| `uav_zone_commercial_ports.geojson` | 台湾地区商港（30 个） |
| `aip_rcr_missing.geojson` | AIP ENR 5.1 补全限航区（RCR8/17/18A/18B/43，5 个） |
| `aip_military_training.geojson` | AIP ENR 5.2.2 军用训练空域（20 个） |
| `aip_uas_training.geojson` | AIP ENR 5.2.4 军用 UAS 训练空域（24 个） |
| `aip_civil_training.geojson` | AIP ENR 5.3 民用训练空域（2 个） |
| `aip_air_sports.geojson` | AIP ENR 5.5 空中运动空域（31 个） |

## 来源与生成方式

- 页面：<https://dronemap.boggy.tw/>（作者：Yu-Chun Chang / Boggy Jang）
- 图层元数据：<https://tiles.dronemap.boggy.tw/data/uavtiles.json>
  - source-layer：`uav_zone`
  - 瓦片：`https://tiles.dronemap.boggy.tw/data/uavtiles/{z}/{x}/{y}.pbf`（z0–13，gzip）
- 原始资料来源：依 DroneMapTW 页面声明，禁航区资料来自**台湾地区民航主管部门**<https://drone.caa.gov.tw>
- 导出时间：2026-10-24
- 导出方法：抓取覆盖台湾岛、澎湖、金门、马祖、绿岛、兰屿、东沙、南沙等区域的 z13 瓦片，按要素 `id` 合并拼接，转为 GeoJSON；未做几何简化
- 坐标参考：WGS84 / OGC:CRS84

## 属性字段

| 字段 | 说明 |
| --- | --- |
| `id` | 要素 ID |
| `zoneName` | 区域名称 |
| `restrictionZone` | 源数据字段：`红区`（禁止）/ `黄区`（限制）/ `null`（国家公园、商港等） |
| `dataType` | `UAV` / `NATIONAL_PARK` / `COMMERCIAL_PORT` |
| `agencyName` | 主管机关 |
| `consultedAgencyName` | 会商机关 |
| `contactInfo` | 联系方式 |
| `penalty` | 罚则说明 |
| `zoneDescription` | 区域说明 |

## 统计

- 要素：5,177（Polygon 5,175，MultiPolygon 2）
- `dataType`：UAV 5081，NATIONAL_PARK 66，COMMERCIAL_PORT 30
- `restrictionZone`：禁止 4,953（红区），限制 128（黄区），空值 96
- 主管机关：25 个
- 范围 bbox：[114.214211, 10.215894, 122.124882, 26.348652]

## 飞行限制版本（`uav_zone_tw_restrictions.geojson`）

如果只关心禁限飞行限制，可直接使用这个文件：

- 仅保留禁限航区（禁止/限制）要素（去掉国家公园、商港等）；
- 过滤后：5,081 个要素（禁止 4,953 / 限制 128）；
- 按**完全相同的几何**去重：64 组重复几何、移除 65 个重复要素，最终 **5,016 个要素**（禁止 4,894 / 限制 122）；
- 合并时优先保留禁止区域记录，其余记录的 `id` / `zoneName` / `agencyName` 写入 `mergedIds` / `mergedNames` / `mergedAgencies`，并带 `mergedCount`；
- 未做几何简化，坐标仍为 WGS84。

注意：完全相同的几何不一定代表同一条限制（例如同一边界被不同机关分别登记），合并后这些原始名称仍保留在 `mergedNames` 里；如果业务上要求“一条记录都不能少”，请使用未去重的 `uav_zone_tw.geojson` 或只做过滤不过滤重复。

## 完整性说明（重要）

DroneMapTW 的 TileJSON 声明源图层共 **5,191** 个要素。按要求**不纳入线状边界数据**（金门/马祖 3 条 `KINMEN_MATSU_DRONE_ZONE` LineString），最终导出 **5,177 个面要素**。另有 **11 个**源要素没有出现在公开瓦片中（推测是 tippecanoe 构建瓦片时按密度丢弃的小要素；z12/z13/z14 均未找到），无法从公开瓦片还原。如果你需要与源数据 100% 一致，需要联系 DroneMapTW 作者或直接向台湾地区民航主管部门取得原始图资。

除禁止/限制区域外，导出的面图层还包括：

| dataType | 数量 | 说明 |
| --- | --- | --- |
| `NATIONAL_PARK` | 66 | 10 个国家（自然）公园内的禁限航范围：台江 45、金门 8、寿山 6、阳明山/太鲁阁/垦丁/澎湖南方四岛/玉山/雪霸/东沙环礁各 1 |
| `COMMERCIAL_PORT` | 30 | 商港管制/禁止飞行区域：台中港 7、高雄港 5、台北港 4、基隆港 3、安平港 3、澎湖港 3、苏澳港 3、布袋港 1、花莲港 1 |
| 公路（派生） | 92 | `zoneName`/机关名称含“公路”或“高速公路”的区域，全部为禁止区域；已从禁止区域中拆分 |
| 铁路（高铁，派生） | 46 | 台铁/高铁/铁道/铁路两侧/火车站等区域，全部为禁止区域；已从禁止区域中拆分 |

国家公园、商港的 `restrictionZone` 为空，但属于禁限飞区域；线状的金门/马祖边界已按需求排除。主页面按禁止区域（4,756）、限制区域（122）、公路（92）、铁路（高铁，46）、国家公园（66）、商港（30）六类拆分加载；公路、铁路（高铁）、国家公园、商港默认不勾选。

## 授权与署名

DroneMapTW 站点未声明开放数据授权条款，原始资料版权属台湾地区民航主管部门。此导出仅做了格式转换与拼接，**不附带任何再分发授权**。使用或再分发前请：

1. 向 DroneMapTW 作者确认可否使用其瓦片/整理数据；
2. 向台湾地区民航主管部门确认原始图资的开放授权范围；
3. 保留署名，例如：`资料来源：DroneMapTW (https://dronemap.boggy.tw)；原始资料：台湾地区民航主管部门`。

本文件也不构成对任何飞行限制的权威说明，实际飞行请以台湾地区民航主管部门及台湾地区有关主管部门最新公告为准。

## 与“台湾地区禁止、限制空域”图层去重

- 原始空域线数据：`geojson/tw_air.geojson`（92 条线，保持原样）
- 去重结果：`data/tw_air_dedup.geojson`（保留 7 条线）
- 去重规则：一条空域线的 ≥99% 长度落在禁限航区或 AIP 补全限航区外扩约 50 m 范围内，视为重复并删除
- 删除明细：`data/tw_air_dedupe_report.json`（80 条）与 `data/tw_air_duplicate_report.json`（后续对 AIP 图层去除的 5 条）
- 主页面当前使用去重后的 `data/tw_air_dedup.geojson`

注意：这是近似去重，因为原空域图层是线数据（92 条线中仅 28 条闭合），无法直接做严格的面积包含判断。

## 文本用字

- 属性中的中文（区域名称、机关名称、说明、罚则、联系方式等）已统一转为简体中文。
- 主要交通机构按大陆官方表述做了统一，例如「台湾地区民航主管部门」「台湾地区铁路主管部门」「台湾地区公路主管部门」。
- 原始英文、邮箱、电话、网址保持不变。
- 「施放」按语义拆分：涉及无人机的改为「无人机飞行」或「飞行」，涉及有碍飞航安全物体的改为「升放」。
- 台湾地区地方机构名统一为「台“XX”」形式，例如：高雄市政府 → 台“高雄市”，苗栗县警察局 → 台“苗栗县”警察局，桃园市桃园区公所 → 台“桃园市桃园区”。

## AIP ENR 5.1 限航区补全

- 数据源：`RC-ENR 5.1.pdf`（AIP ENR 5.1 禁航区、限航区及危险区）
- 当前无人机数据中有 22 个 RCR，缺 RCR8、RCR17、RCR18A、RCR18B、RCR43
- `aip_rcr_missing.geojson` 按 AIP 坐标补全这 5 个限航区，包含 `aipCode`、`aipName`、`aipUpperLimit`、`aipLowerLimit`、`aipTime`、`aipSource` 字段
- 现有 RCR 要素也补了 `aipCode`、`aipName`、`aipUpperLimit`、`aipLowerLimit`、`aipLimits`、`aipTime`、`aipAuthority`、`aipDroneClause`、`aipSource` 字段，信息来自 AIP ENR 5.1

## AIP ENR 5.2 / 5.3 / 5.5 专题图层

- `aip_military_training.geojson`：ENR 5.2.2 军用训练空域 20 个（A1–A5、五空域、四空域 A/B、三空域、二空域东/西、CK/CK1、嘉义、归仁、恒春、花莲、龙潭、新社、左营）
- `aip_uas_training.geojson`：ENR 5.2.4 军用 UAS 训练空域 24 个（ARMY1–6，以及 NA/NB/NC/ND/NE 系列），含 `aipCode`、`aipName`、上下限、时间、管理单位
- `aip_civil_training.geojson`：ENR 5.3.1.1 民用训练空域 2 个（南湾、台东纵谷）
- `aip_air_sports.geojson`：ENR 5.5 空中运动空域 31 个（超轻型载具、热气球、飞行伞），含 `airspaceType`、上下限
- 这三个图层默认不勾选，勾选后才加载
