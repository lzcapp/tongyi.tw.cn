# 第三方组件与数据声明（THIRD_PARTY_NOTICES）

本项目自身代码以 [MIT 许可证](LICENSE) 发布（Copyright (c) 2026 tongyi.tw.cn contributors）。
仓库中包含或引用了下列第三方组件与数据，它们各自遵循其原有许可证与条款，**不适用**本项目的 MIT 许可证。

> 说明：本文件只记录**已核实**的许可证信息；无法确认来源或许可证的内容会明确写“需核实”，请勿据此推定授权。

## 1. Leaflet（地图引擎）

- **版本**：1.9.4
- **许可证**：BSD-2-Clause（二条款 BSD 许可证）
- **本地路径**：`src/vendor/leaflet/leaflet.js`、`src/vendor/leaflet/leaflet.css`、`src/vendor/leaflet/images/`
- **上游项目**：<https://github.com/Leaflet/Leaflet>
- **版权**：文件头保留 `(c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade`（依据 `src/vendor/leaflet/leaflet.js` 头部声明）
- **说明**：本地文件保留了上游的版权头；BSD-2-Clause 许可证条款全文见上游仓库的 `LICENSE` 文件。再分发 Leaflet 时须保留版权声明、许可证条款与免责声明。

## 2. Leaflet.Legend（图例控件）

- **许可证**：MIT
- **本地路径**：`src/leaflet.legend.js`、`src/leaflet.legend.css`
- **上游项目**：<https://github.com/ptma/Leaflet.Legend>
- **版权**：Copyright (c) 2020 ptma@163.com（依据上游仓库 LICENSE 文件，已核实）
- **说明**：上游仓库为 MIT 许可证；再分发时须保留其版权声明与许可证文本。

## 3. Leaflet.ChineseTmsProviders（中国地图服务图层提供者）

- **许可证**：MIT
- **本地路径**：`src/leaflet.ChineseTmsProviders.js`
- **上游项目**：<https://github.com/htoooth/Leaflet.ChineseTmsProviders>
- **版权**：Copyright (C) 2014 Tao Huang（依据上游仓库 LICENSE 文件，已核实）
- **附加说明**：
  - 该文件首行注释注明 `L.CRS.Baidu` 参考自 <https://github.com/muyao1987/leaflet-tileLayer-baidugaode>。该参考项目采用 Apache-2.0 许可证（已核实），若本项目文件实际复用了其中代码，可能需要同时满足 Apache-2.0 的署名/声明要求，**建议进一步核实**。
  - 文件中的天地图地址仅包含 `tk={key}` 占位符，本仓库**不包含**任何真实天地图密钥；使用天地图服务需自行申请密钥并遵守其服务条款。

## 4. leaflet.mapCorrection.min.js（坐标纠偏补丁）

- **许可证**：**不明，需核实**
- **本地路径**：`src/leaflet.mapCorrection.min.js`
- **来源**：**不明，需核实**。文件为压缩代码，**没有版权头、许可证声明或来源链接**。
- **功能**：定义 `L.CoordConver`，实现 WGS-84 / GCJ-02 / BD-09 之间的坐标转换，并改写 `L.TileLayer.ChinaProvider` / `L.GridLayer` 的瓦片定位逻辑，使国内偏移底图（高德、百度等）能与 WGS-84 数据对齐。
- **风险提示**：在其许可证与来源确认之前，**不应假定该文件可自由再分发或商用**。建议向上游作者确认授权，或替换为许可证明确的实现（例如自行实现 GCJ-02 转换逻辑）。

## 5. GeoJSON 数据（`geojson/`）

- **版权与来源**：**未声明，需核实**
- **路径**：`geojson/*.geojson`
- **说明**：仓库中没有这些数据的来源、采集方式、坐标系基准说明或授权声明。在取得明确授权之前，不应将数据用于商业用途或再分发；如需引用，请先联系项目维护者核实。数据仅作示意展示，不构成权威地理或军事信息。

## 6. 外部地图瓦片服务（非本仓库代码）

页面底图通过第三方瓦片服务按需加载，本项目**不缓存、不再分发**瓦片，但使用这些服务须遵守各自的服务条款与署名要求：

| 服务 | 站点 | 条款/署名 |
| --- | --- | --- |
| OpenStreetMap | <https://www.openstreetmap.org/> | 数据 © OpenStreetMap contributors，ODbL；瓦片使用政策见 <https://operations.osmfoundation.org/policies/tiles/> |
| CARTO（Dark Matter 底图） | <https://carto.com/> | 见 CARTO 服务条款与署名要求 |
| 高德地图（GaoDe） | <https://www.amap.com/> | 需遵守高德开放平台服务条款，页面应保留其署名 |
| 天地图（TianDiTu） | <https://www.tianditu.gov.cn/> | 需自行申请 `tk` 密钥并遵守服务条款 |

> 注意：底图可用性、精度与配额由上述第三方决定，本项目不提供任何保证。

## 7. 若后续新增第三方组件

新增任何第三方库或数据时，请在本文件中补充其名称、版本、许可证、来源链接与本地路径，并保留原始版权头。
