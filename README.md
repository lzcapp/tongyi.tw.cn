# 统一，台湾！

![GitHub deployments](https://img.shields.io/github/deployments/lzcapp/tongyi.tw.cn/github-pages?style=for-the-badge) &ensp; ![Website](https://img.shields.io/website?url=https%3A%2F%2Ftongyi.tw.cn%2F&style=for-the-badge&label=tongyi.tw.cn)

[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/19iu3.svg)](https://uptime.betterstack.com/?utm_source=status_badge)

一个展示**台湾周边空域与历次台海军事演习范围**的纯静态互动地图，基于 [Leaflet](https://leafletjs.com/) 构建，部署在 GitHub Pages 上：<https://tongyi.tw.cn/>

站点无构建步骤：HTML / CSS / JS / GeoJSON 均为静态文件，推到 `main` 分支根目录即发布。

## 功能

- **底图切换**：OpenStreetMap（默认）、CartoDB 暗色、高德地图、高德卫星影像；通过右上角图层控件切换，底图署名由 Leaflet 版权控件按提供方显示。
- **9 个专题图层**：台方划设的防空识别区（ADIZ）、禁限空域，以及 1996 年至今历次台海演习范围，以线/面样式叠加在地图上；右上角图层控件可单独勾选/取消，默认全部显示。
- **按需加载与稳定叠放**：图层首次勾选时才 `fetch` 对应 GeoJSON（取消勾选后数据保留在内存中）；每个图层使用独立 pane 并固定 z-index，叠放顺序不随请求完成先后变化。
- **图层信息面板**：点击要素后，左下角显示图层名称，以及要素的 `name` / `date` / `agency` / `activity` 字段和几何类型描述；线状要素额外绘制透明加宽热区便于点选。点击地图空白处、按 `Esc` 或点关闭按钮收起。
- **图例控件**：左上角可折叠图例（基于 Leaflet.Legend），颜色与专题图层样式对应。
- **关于本页**：右上角按钮打开模态对话框，包含数据说明、第三方组件与仓库链接。
- **视图深链**：当前地图中心与缩放级别同步写入 URL hash，可分享链接或刷新后保持视角。
- **加载与错误提示**：顶部状态面板显示图层加载进度；加载失败的图层会列出并提供重试按钮；底图瓦片连续加载失败时提示切换到高德地图。
- **坐标纠偏**：通过 `src/leaflet.mapCorrection.min.js` 对高德等 GCJ-02 偏移底图做瓦片纠偏，使 WGS-84 的 GeoJSON 数据与底图对齐。
- **响应式与无障碍**：地图占满整个视口（`100dvh`），提供隐藏的一级标题、`aria-live` 状态区、可见焦点样式，以及 `<noscript>` 提示。

## 目录结构

```text
tongyi.tw.cn/
├── index.html                    # 页面入口（仅结构，样式/脚本外链，无外部 CDN）
├── 404.html                      # 中文 404 页（无外部依赖，链接回首页）
├── robots.txt                    # 爬虫规则
├── sitemap.xml                   # 站点地图
├── favicon.svg                   # 站点图标
├── CNAME                         # GitHub Pages 自定义域名：tongyi.tw.cn
├── LICENSE                       # MIT 许可证
├── THIRD_PARTY_NOTICES.md        # 第三方组件与数据声明
├── README.md
├── .github/
│   └── workflows/
│       └── validate.yml          # CI：GeoJSON 校验 + 环闭合检查 + HTML 校验 + 密钥残留检查
├── src/
│   ├── app.js                    # 地图初始化、底图与专题图层配置
│   ├── style.css                 # 站点样式
│   ├── vendor/
│   │   └── leaflet/              # 本地化的 Leaflet 1.9.4（leaflet.js / leaflet.css / images/）
│   ├── leaflet.ChineseTmsProviders.js   # 中国地图服务图层提供者（MIT）
│   ├── leaflet.mapCorrection.min.js     # 坐标纠偏补丁（来源/许可证待核实）
│   ├── leaflet.legend.js                # 图例控件（MIT）
│   └── leaflet.legend.css
├── geojson/                      # 24 个 GeoJSON 数据文件（详见「数据说明」）
└── scripts/
    ├── normalize-geojson.py      # 闭合未闭合的线性环（幂等，支持 --check）
    └── validate-geojson.py       # 数据校验脚本（CI 使用）
```

## 本地预览

站点使用 `fetch` 加载 `geojson/` 下的数据，**必须通过 HTTP 访问**（直接双击 `index.html` 用 `file://` 打开会因跨域限制导致图层加载失败）：

```bash
cd tongyi.tw.cn
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080/
```

或使用任意静态文件服务器（`npx serve`、`php -S` 等）指向仓库根目录。

## 数据说明

### 当前渲染的 9 个图层

在 `src/app.js` 的专题图层配置中启用，页面加载时请求：

| 文件 | 图层名称 |
| --- | --- |
| `geojson/adiz.geojson` | 台方 ADIZ（防空识别区） |
| `geojson/tw_air.geojson` | 台当局划设的禁止、限制空域（92 个要素） |
| `geojson/1996.geojson` | 1996 年台海军事演习 |
| `geojson/2022.geojson` | 2022 年·多兵种联合战备警巡和实战化演练 |
| `geojson/202304.geojson` | 2023 年 4 月·海空联合战备警巡演练 |
| `geojson/202308.geojson` | 2023 年 8 月·海空联合战备警巡演练 |
| `geojson/2024A.geojson` | 2024 年·联合利剑—2024A |
| `geojson/2024B.geojson` | 2024 年·联合利剑—2024B |
| `geojson/2025B.geojson` | 2025 年·正义使命—2025 |

### 预留 / 暂未渲染的 15 个图层

- **仅在代码中以注释形式引用（11 个）**：`adiz_c`、`adiz_j`、`adiz_p`、`adiz_p_j`、`baseline`、`baseline_c`、`medianline`、`rcr_m`、`rcr_p`、`rcr_p_o`、`tw`。
- **完全未被引用（4 个）**：`baseline_p`、`ph`、`rcr`、`road`。

这些文件保留在仓库中但不会在页面上加载；是否启用由 `src/app.js` 的图层配置决定。

### 数据格式

- 坐标以十进制度经纬度存储，代码按 **WGS-84** 处理（与 Leaflet 默认 CRS 一致）；仓库未显式声明数据来源与坐标基准，**需核实**。
- 顶层结构尚未统一：多数文件顶层为单个 `Feature`，`adiz_p_j`、`202304`、`rcr_p`、`rcr_p_o`、`tw_air` 为 `FeatureCollection`。`scripts/normalize-geojson.py` 负责闭合未闭合的线性环（不改变顶层类型），读取方仍需兼容两种顶层结构。

### 更新时间

- `geojson/` 下数据最近一次提交：**2026-02-28**（依据 git 历史）。
- `index.html` 最近一次提交：**2026-03-10**（依据 git 历史）。

### 来源与版权

**数据来源、采集方式与版权均未在仓库中声明，需核实。** 在取得明确授权前，请勿将数据用于商业用途或再分发。详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

### 疑似异常数据

- `geojson/rcr_m.geojson`：经度约 **12.02–12.61**，明显偏离台湾周边（该区域应约为 118–122°E），疑似坐标录入/解析错误。该图层当前未渲染；`scripts/validate-geojson.py` 会对其输出 warning。
- `geojson/tw.geojson`：坐标范围约 **118.28–118.47°E、24.39–24.53°N**，落在金门一带而非台湾本岛，疑似只覆盖金门区域。该图层当前未渲染。

## 开发与校验

无构建步骤，直接编辑静态文件即可。提交前建议运行：

```bash
# 校验 GeoJSON 数据（顶层结构、环闭合、坐标范围、引用文件是否存在）
python3 scripts/validate-geojson.py

# 检查是否有未闭合的线性环（只检查、不写回；需要修复时退出码为 1）
python3 scripts/normalize-geojson.py --check

# 自动闭合 Polygon / MultiPolygon 的线性环并写回（幂等）
python3 scripts/normalize-geojson.py

# 校验 index.html 的 HTML 规范
npx --yes html-validate@9 index.html
```

`scripts/validate-geojson.py` 只依赖 Python 标准库；无参数运行，存在 error 时退出码为 1，仅 warning 时退出码为 0。

## 部署

- **平台**：GitHub Pages，**Deploy from a branch** → `main` 分支 → `/ (root)`。
- **自定义域名**：仓库根目录的 `CNAME` 文件内容为 `tongyi.tw.cn`。
- **发布流程**：向 `main` 分支推送（或合并 PR）即触发 GitHub Pages 重新发布，无需构建。
- **CI**：`.github/workflows/validate.yml` 在 push / PR 到 `main` 时运行校验（见下节）；CI 失败不阻止发布，但不应合并失败的分支。

## 持续集成（CI）

`.github/workflows/validate.yml` 在 `push` 与 `pull_request` 到 `main` 时触发，执行环境为 `ubuntu-latest`：

1. `actions/checkout@v4` 检出代码；
2. `actions/setup-python@v5` 准备 Python；
3. `actions/setup-node@v4`（Node 20）准备 Node；
4. `python3 scripts/validate-geojson.py` 校验数据；
5. `python3 scripts/normalize-geojson.py --check` 检查线性环是否全部闭合（只检查不写回，需要修复时失败）；
6. `npx --yes html-validate@9 index.html` 校验 HTML；
7. 用 `grep` 检查 `index.html` 与 `src/` 中不得出现 `rapidapi-key` 字样，防止密钥回归。

## 许可证与第三方组件

- 本项目代码采用 **MIT 许可证**，见 [LICENSE](LICENSE)。
- 第三方组件（Leaflet、Leaflet.Legend、Leaflet.ChineseTmsProviders、坐标纠偏补丁）与 GeoJSON 数据分别遵循其原有许可证/条款，详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。其中 `src/leaflet.mapCorrection.min.js` 的来源与许可证**不明，需核实**；GeoJSON 数据版权**未声明，需核实**。

## 安全说明

- **历史版本 `index.html` 曾以明文硬编码 RapidAPI 密钥**（用于 MapTilesAPI 底图）。当前版本已移除该密钥与对应配置；CI 会检查 `index.html` 与 `src/` 中是否出现 `rapidapi-key`，防止再次提交。
- ⚠️ **仅从当前文件中删除密钥并不能止损**：该密钥已存在于公开的 git 历史中。**项目所有者必须在 RapidAPI 控制台吊销（revoke）该旧密钥并轮换**，同时视情况清理 git 历史。
- 天地图等其他地图服务的密钥不应写入前端代码；`src/leaflet.ChineseTmsProviders.js` 中仅保留 `tk={key}` 占位符，使用前需自行申请并注入。
- 请勿向仓库提交任何真实密钥、令牌或凭据；如需使用受限地图服务，建议通过后端代理转发。

## 已知限制

- 15 个 GeoJSON 图层尚未渲染（部分为预留数据），数据文件与页面配置可能不同步。
- GeoJSON 顶层结构不统一（`Feature` 与 `FeatureCollection` 混用），依赖读取方兼容。
- 底图依赖第三方瓦片服务（OpenStreetMap、CARTO、高德），其可用性、精度、配额与使用条款由第三方决定，离线环境下底图不可用。天地图仅在 `src/leaflet.ChineseTmsProviders.js` 中提供接入方式，默认未启用（需自行申请 `tk` 密钥）。
- 坐标纠偏为经验算法，国内偏移底图与 WGS-84 数据之间可能存在残余偏移。
- 无构建流程与自动化测试框架，仅有静态校验（GeoJSON + HTML）。
- 项目未声明浏览器兼容范围；Leaflet 1.9 支持现代浏览器。
- 仓库中的界面截图可能为旧版本，与实际页面存在差异。

## 免责声明

本项目用于地理信息可视化演示。ADIZ、领海基线、演习区域等边界均为整理/示意数据，可能与官方公布信息存在差异，**不构成任何权威主张或法律依据**。

## 截图

![Screenshot](https://github.com/user-attachments/assets/8559602d-e6ee-45d5-8450-6ef24ed88666)

> 该截图来自改造前的版本，界面可能已变化。
