/* global L */
/**
 * 台湾地区空域互动地图
 *
 * 图层 / 图例 / 样式集中在本文件的 LAYER_CONFIG 中维护，新增图层时只需追加一项配置。
 * 图层数据按需加载：复选框勾选后才 fetch 对应 GeoJSON，取消勾选后数据保留在内存中。
 */
(function () {
    'use strict';

    var APP_VERSION = '2026-10-24-16';
    console.info('tongyi.tw.cn app version:', APP_VERSION);

    var DEFAULT_VIEW = { center: [24, 120.9], zoom: 6 };

    var OSM_ATTRIBUTION =
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
    var ESRI_ATTRIBUTION =
        'Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a> — Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community';
    var AMAP_ATTRIBUTION =
        '&copy; <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图</a>';

    // 底图瓦片失败提示状态（提前声明，瓦片请求可能早于后续初始化完成）
    var tileWarning = { active: false, dismissed: false, label: '' };

    // 全图统一边框宽度
    var BORDER_WEIGHT = 1.5;
    var BORDER_OPACITY = 0.55;
    var FILL_OPACITY = 0.12;
    var LEGEND_FILL_OPACITY = 0.35;
    var LEGEND_LINE_OPACITY = 0.8;

    function areaStyle(fillColor, borderColor) {
        return {
            color: borderColor,
            weight: BORDER_WEIGHT,
            opacity: BORDER_OPACITY,
            fillColor: fillColor,
            fillOpacity: FILL_OPACITY,
            fillRule: 'nonzero'
        };
    }

    function lineStyle(color, dashArray) {
        return {
            color: color,
            weight: BORDER_WEIGHT,
            opacity: BORDER_OPACITY,
            dashArray: dashArray,
            fill: false
        };
    }

    function areaLegend(label, fillColor) {
        return {
            label: label,
            type: 'rectangle',
            fillColor: fillColor,
            fillOpacity: LEGEND_FILL_OPACITY,
            stroke: false
        };
    }

    function lineLegend(label, color, dashArray) {
        return {
            label: label,
            type: 'polyline',
            color: color,
            weight: BORDER_WEIGHT,
            opacity: LEGEND_LINE_OPACITY,
            dashArray: dashArray,
            stroke: true
        };
    }

    // ---------------------------------------------------------------------
    // 图层配置（顺序即叠放顺序：数组越靠后，绘制层级越高）
    // ---------------------------------------------------------------------
    var LAYER_CONFIG = [
        {
            id: 'adiz',
            name: '台湾地区防空识别区（ADIZ）',
            file: './geojson/adiz.geojson',
            style: lineStyle('#1e40af', '10, 0, 0, 10'),
            legend: lineLegend('台湾地区防空识别区（ADIZ）', '#1e40af', '10, 0, 0, 10')
        },
        {
            id: 'tw_air',
            name: '台湾地区禁止、限制空域',
            file: './data/tw_air_dedup.geojson',
            style: lineStyle('#1d4ed8', '6, 6'),
            legend: lineLegend('台湾地区禁止、限制空域', '#1d4ed8', '6, 6')
        },
        {
            id: '1996',
            name: '1996年3月 · 台湾海峡陆海空三军联合作战演习',
            file: './geojson/1996.geojson',
            style: areaStyle('#7f1d1d', '#450a0a'),
            legend: areaLegend('1996年3月 · 台湾海峡陆海空三军联合作战演习', '#7f1d1d')
        },
        {
            id: '2022',
            name: '2022年8月 · 多军兵种联合战备警巡和实战化演练',
            file: './geojson/2022.geojson',
            style: areaStyle('#991b1b', '#7f1d1d'),
            legend: areaLegend('2022年8月 · 多军兵种联合战备警巡和实战化演练', '#991b1b')
        },
        {
            id: '202304',
            name: '2023年4月 · 环台岛战备警巡和“联合利剑”演习',
            file: './geojson/202304.geojson',
            style: areaStyle('#b91c1c', '#991b1b'),
            legend: areaLegend('2023年4月/8月 · 环台岛战备警巡、“联合利剑”演习与联合演训', '#b91c1c')
        },
        {
            id: '202308',
            name: '2023年8月 · 海空联合战备警巡和联合演训',
            file: './geojson/202308.geojson',
            style: areaStyle('#b91c1c', '#991b1b'),
            // 与 2023 年 4 月共用图例
            legend: null
        },
        {
            id: '2024A',
            name: '2024年5月 · “联合利剑—2024A”演习',
            file: './geojson/2024A.geojson',
            style: areaStyle('#dc2626', '#b91c1c'),
            legend: areaLegend('2024年5月 · “联合利剑—2024A”演习', '#dc2626')
        },
        {
            id: '2024B',
            name: '2024年10月 · “联合利剑—2024B”演习',
            file: './geojson/2024B.geojson',
            style: areaStyle('#e11d48', '#be123c'),
            legend: areaLegend('2024年10月 · “联合利剑—2024B”演习', '#e11d48')
        },
        {
            id: '2025B',
            name: '2025年12月 · “正义使命—2025”演习',
            file: './geojson/2025B.geojson',
            style: areaStyle('#ef4444', '#dc2626'),
            legend: areaLegend('2025年12月 · “正义使命—2025”演习', '#ef4444')
        },
        {
            id: 'restricted_prohibited',
            name: '台湾地区禁止区域',
            file: './data/uav_zone_red.geojson',
            defaultVisible: true,
            canvas: true,
            style: areaStyle('#1e40af', '#1e3a8a'),
            legend: areaLegend('台湾地区禁止区域', '#1e40af')
        },
        {
            id: 'restricted_limited',
            name: '台湾地区限制区域',
            file: './data/uav_zone_yellow.geojson',
            defaultVisible: true,
            canvas: true,
            style: areaStyle('#3b82f6', '#1d4ed8'),
            legend: areaLegend('台湾地区限制区域', '#3b82f6')
        },
        {
            id: 'road',
            name: '台湾地区公路',
            file: './data/uav_zone_highways.geojson',
            defaultVisible: false,
            canvas: true,
            style: areaStyle('#60a5fa', '#2563eb'),
            legend: areaLegend('台湾地区公路', '#60a5fa')
        },
        {
            id: 'rail',
            name: '台湾地区铁路（高铁）',
            file: './data/uav_zone_railways.geojson',
            defaultVisible: false,
            canvas: true,
            style: areaStyle('#4f46e5', '#3730a3'),
            legend: areaLegend('台湾地区铁路（高铁）', '#4f46e5')
        },
        {
            id: 'national_park',
            name: '台湾地区国家公园',
            file: './data/uav_zone_national_parks.geojson',
            defaultVisible: false,
            canvas: true,
            style: areaStyle('#0e7490', '#155e75'),
            legend: areaLegend('台湾地区国家公园', '#0e7490')
        },
        {
            id: 'commercial_port',
            name: '台湾地区商港',
            file: './data/uav_zone_commercial_ports.geojson',
            defaultVisible: false,
            canvas: true,
            style: areaStyle('#0ea5e9', '#0369a1'),
            legend: areaLegend('台湾地区商港', '#0ea5e9')
        }
    ];


    // ---------------------------------------------------------------------
    // UI 元素
    // ---------------------------------------------------------------------
    var statusEl = document.getElementById('status');
    var statusTextEl = document.getElementById('statusText');
    var statusErrorsEl = document.getElementById('statusErrors');
    var statusActionsEl = document.getElementById('statusActions');
    var statusCloseEl = document.getElementById('statusClose');
    var layerInfoEl = document.getElementById('layerInfo');
    var layerInfoTitleEl = document.getElementById('layerInfoTitle');
    var layerInfoListEl = document.getElementById('layerInfoList');
    var layerInfoCloseEl = document.getElementById('layerInfoClose');
    var aboutDialogEl = document.getElementById('aboutDialog');
    var statusDismissHandler = null;

    // ---------------------------------------------------------------------
    // 地图与底图
    // ---------------------------------------------------------------------
    var map = L.map('map', {
        minZoom: 4,
        maxZoom: 18,
        worldCopyJump: true,
        attributionControl: true
    });

    var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION
    });
    var esriDark = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
            maxZoom: 19,
            maxNativeZoom: 16,
            attribution: ESRI_ATTRIBUTION
        }
    );
    var amap = L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
        maxZoom: 18,
        attribution: AMAP_ATTRIBUTION
    });
    var amapSatellite = L.layerGroup([
        L.tileLayer.chinaProvider('GaoDe.Satellite.Map', {
            maxZoom: 18,
            attribution: AMAP_ATTRIBUTION
        }),
        L.tileLayer.chinaProvider('GaoDe.Satellite.Annotion', {
            maxZoom: 18,
            attribution: AMAP_ATTRIBUTION
        })
    ]);

    var baseLayers = {
        OpenStreetMap: osm,
        'Esri 暗色': esriDark,
        '高德地图': amap,
        '高德卫星影像': amapSatellite
    };

    // 提前注册瓦片失败监听，避免首屏瓦片请求早于监听注册
    watchTileFailures(osm, 'OpenStreetMap');
    watchTileFailures(esriDark, 'Esri 暗色');

    map.attributionControl.addAttribution(
        '禁限航区数据：<a href="https://dronemap.boggy.tw/" target="_blank" rel="noopener">DroneMapTW</a> / 台湾地区民航主管部门'
    );

    var initialView = readViewFromHash() || DEFAULT_VIEW;
    map.setView(initialView.center, initialView.zoom);
    osm.addTo(map);
    map.on('moveend', syncViewToHash);
    syncViewToHash();

    // ---------------------------------------------------------------------
    // 图层状态与按需加载
    // ---------------------------------------------------------------------
    var layerState = {};
    var overlayLayers = {};
    var failedStates = [];

    LAYER_CONFIG.forEach(function (config, index) {
        var group = L.layerGroup();
        // 每个图层使用独立 pane 并固定 z-index，保证叠放顺序与配置顺序一致，
        // 不受网络请求完成先后影响。
        var paneName = 'layer-' + config.id;
        var pane = map.createPane(paneName);
        pane.style.zIndex = String(410 + index);

        var state = {
            config: config,
            group: group,
            paneName: paneName,
            renderer: config.canvas ? L.canvas({ pane: paneName }) : null,
            loaded: false,
            loading: false,
            error: null
        };
        layerState[config.id] = state;
        overlayLayers[config.name] = group;
        group.on('add', function () {
            requestLayer(state);
        });
    });

    L.control.layers(baseLayers, overlayLayers, { collapsed: true, position: 'topright' }).addTo(map);

    // 默认显示图层（禁限航区中的公路/国家公园/商港默认不勾选，勾选后才加载）
    LAYER_CONFIG.forEach(function (config) {
        if (config.defaultVisible !== false) {
            overlayLayers[config.name].addTo(map);
        }
    });


    function requestLayer(state) {
        if (state.loaded || state.loading) {
            return;
        }

        state.loading = true;
        state.error = null;

        var failedIndex = failedStates.indexOf(state);
        if (failedIndex !== -1) {
            failedStates.splice(failedIndex, 1);
        }
        updateStatus();

        fetch(state.config.file)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                }
                return response.json();
            })
            .then(function (data) {
                var geoOptions = {
                    pane: state.paneName,
                    style: state.config.style,
                    // 要素不单独响应点击，统一在 map click 中计算该点覆盖的所有图层
                    interactive: false
                };
                if (state.renderer) {
                    geoOptions.renderer = state.renderer;
                }
                var geoLayer = L.geoJSON(data, geoOptions);
                geoLayer.addTo(state.group);
                state.layer = geoLayer;
                state.loaded = true;
            })
            .catch(function (error) {
                state.error = error;
                failedStates.push(state);
                console.error('图层「' + state.config.name + '」加载失败：', error);
            })
            .finally(function () {
                state.loading = false;
                updateStatus();
            });
    }

    // ---------------------------------------------------------------------
    // 图层信息面板
    // ---------------------------------------------------------------------
    // 线要素没有填充面积，按点击位置到线段的最短像素距离是否在容差内判断
    var LINE_HIT_TOLERANCE_PX = L.Browser.touch ? 10 : 6;

    function findLayersAt(latlng) {
        var matches = [];

        LAYER_CONFIG.forEach(function (config) {
            var state = layerState[config.id];
            if (!state.loaded || !state.layer || !map.hasLayer(state.group)) {
                return;
            }
            var feature = findFeatureAt(state, latlng);
            if (feature) {
                matches.push({ config: config, feature: feature });
            }
        });

        return matches;
    }

    function findFeatureAt(state, latlng) {
        var matched = null;

        state.layer.eachLayer(function (featureLayer) {
            if (matched || !featureLayer.feature) {
                return;
            }
            var geometry = featureLayer.feature.geometry;
            if (!geometry) {
                return;
            }
            if (featureLayer.getBounds) {
                var bounds = featureLayer.getBounds();
                if (bounds.isValid() && !bounds.contains(latlng)) {
                    return;
                }
            }
            if (geometryHit(geometry, latlng)) {
                matched = featureLayer.feature;
            }
        });

        return matched;
    }

    function geometryHit(geometry, latlng) {
        switch (geometry.type) {
            case 'Polygon':
                return polygonHit(geometry.coordinates, latlng);
            case 'MultiPolygon':
                return geometry.coordinates.some(function (polygon) {
                    return polygonHit(polygon, latlng);
                });
            case 'LineString':
                return lineStringHit(geometry.coordinates, latlng);
            case 'MultiLineString':
                return geometry.coordinates.some(function (line) {
                    return lineStringHit(line, latlng);
                });
            default:
                return false;
        }
    }

    function polygonHit(rings, latlng) {
        if (!rings.length) {
            return false;
        }
        // 本项目的 GeoJSON 把多个分离的演习区域放在同一个 Polygon 的多个环里
        // （而不是标准的内环/洞），因此每个环都按独立区域判断命中。
        return rings.some(function (ring) {
            return ringContains(ring, latlng);
        });
    }

    // 闭合的 LineString 表示一个封闭空域，按区域命中；未闭合的仍按边界容差命中
    function lineStringHit(coords, latlng) {
        if (isClosedRing(coords)) {
            return (
                ringContains(coords, latlng) ||
                distanceToLinePx(coords, latlng) <= LINE_HIT_TOLERANCE_PX
            );
        }
        return distanceToLinePx(coords, latlng) <= LINE_HIT_TOLERANCE_PX;
    }

    function isClosedRing(coords) {
        if (!coords || coords.length < 4) {
            return false;
        }
        var first = coords[0];
        var last = coords[coords.length - 1];
        return first[0] === last[0] && first[1] === last[1];
    }

    function ringContains(ring, latlng) {
        var inside = false;
        for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            var xi = ring[i][0];
            var yi = ring[i][1];
            var xj = ring[j][0];
            var yj = ring[j][1];
            var crosses =
                (yi > latlng.lat) !== (yj > latlng.lat) &&
                latlng.lng < ((xj - xi) * (latlng.lat - yi)) / (yj - yi) + xi;
            if (crosses) {
                inside = !inside;
            }
        }
        return inside;
    }

    function distanceToLinePx(coords, latlng) {
        if (!coords || coords.length < 2) {
            return Infinity;
        }
        var target = map.latLngToLayerPoint(latlng);
        var min = Infinity;

        for (var i = 0; i < coords.length - 1; i++) {
            var start = map.latLngToLayerPoint(L.latLng(coords[i][1], coords[i][0]));
            var end = map.latLngToLayerPoint(L.latLng(coords[i + 1][1], coords[i + 1][0]));
            min = Math.min(min, distanceToSegment(target, start, end));
        }

        return min;
    }

    function distanceToSegment(point, start, end) {
        var dx = end.x - start.x;
        var dy = end.y - start.y;
        if (dx === 0 && dy === 0) {
            return point.distanceTo(start);
        }
        var t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
        return point.distanceTo(L.point(start.x + t * dx, start.y + t * dy));
    }

    function formatFeatureDetails(feature) {
        var properties = (feature && feature.properties) || {};
        var details = [];

        function addDetail(value) {
            if (typeof value !== 'string') {
                return;
            }
            value = value.trim();
            // 部分数据的 name 字段是无意义的占位值
            if (!value || value.toLowerCase() === 'path' || details.indexOf(value) !== -1) {
                return;
            }
            details.push(value);
        }

        ['name', 'zoneName', 'date', 'agency', 'activity', 'agencyName'].forEach(function (key) {
            addDetail(properties[key]);
        });

        return details.join(' · ');
    }

    function showLayerInfo(matches) {
        if (!matches.length) {
            hideLayerInfo();
            return;
        }

        layerInfoTitleEl.textContent =
            matches.length > 1 ? '此处重叠的图层（' + matches.length + '）' : '当前图层';
        layerInfoListEl.textContent = '';

        matches.forEach(function (match) {
            var item = document.createElement('li');
            item.className = 'layer-info__item';

            var name = document.createElement('p');
            name.className = 'layer-info__name';
            name.textContent = match.config.name;
            item.appendChild(name);

            var detailText = formatFeatureDetails(match.feature);
            if (detailText) {
                var detail = document.createElement('p');
                detail.className = 'layer-info__detail';
                detail.textContent = detailText;
                item.appendChild(detail);
            }

            layerInfoListEl.appendChild(item);
        });

        layerInfoEl.hidden = false;
    }

    function hideLayerInfo() {
        layerInfoEl.hidden = true;
    }

    map.on('click', function (event) {
        showLayerInfo(findLayersAt(event.latlng));
    });

    layerInfoCloseEl.addEventListener('click', hideLayerInfo);

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !layerInfoEl.hidden) {
            hideLayerInfo();
        }
    });

    // ---------------------------------------------------------------------
    // 状态提示
    // ---------------------------------------------------------------------
    statusCloseEl.addEventListener('click', function () {
        hideStatus();
        if (statusDismissHandler) {
            var handler = statusDismissHandler;
            statusDismissHandler = null;
            handler();
        }
    });

    function showStatus(message, options) {
        options = options || {};
        statusDismissHandler = options.onDismiss || null;
        statusTextEl.textContent = message;
        statusErrorsEl.textContent = '';

        (options.errors || []).forEach(function (text) {
            var item = document.createElement('li');
            item.textContent = text;
            statusErrorsEl.appendChild(item);
        });

        statusActionsEl.textContent = '';
        (options.actions || []).forEach(function (action) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'status__action';
            button.textContent = action.label;
            button.addEventListener('click', action.onClick);
            statusActionsEl.appendChild(button);
        });

        statusCloseEl.hidden = !options.dismissible;
        statusEl.hidden = false;
    }

    function hideStatus() {
        statusEl.hidden = true;
    }

    function updateStatus() {
        if (failedStates.length) {
            showStatus('部分图层加载失败，可以重试或稍后再试。', {
                errors: failedStates.map(function (state) {
                    return state.config.name;
                }),
                actions: [{ label: '重试', onClick: retryFailedLayers }],
                dismissible: true
            });
            return;
        }

        if (tileWarning.active) {
            renderTileWarning();
            return;
        }

        var loadingCount = LAYER_CONFIG.filter(function (config) {
            return layerState[config.id].loading;
        }).length;

        if (loadingCount > 0) {
            showStatus('正在加载地图数据…');
            return;
        }

        hideStatus();
    }

    function retryFailedLayers() {
        var retryList = failedStates.slice();
        failedStates.length = 0;

        retryList.forEach(function (state) {
            if (map.hasLayer(state.group)) {
                requestLayer(state);
            } else {
                map.addLayer(state.group);
            }
        });

        updateStatus();
    }

    // ---------------------------------------------------------------------
    // 底图加载失败兜底
    // ---------------------------------------------------------------------
    function watchTileFailures(layer, label) {
        var errorCount = 0;
        layer.on('tileerror', function () {
            if (!map.hasLayer(layer) || tileWarning.active || tileWarning.dismissed) {
                return;
            }
            errorCount += 1;
            if (errorCount < 6) {
                return;
            }
            tileWarning.active = true;
            tileWarning.label = label;
            renderTileWarning();
        });
    }

    function renderTileWarning() {
        showStatus('底图「' + tileWarning.label + '」加载失败，可能是网络或服务不可用。', {
            actions: [
                {
                    label: '切换到高德地图',
                    onClick: function () {
                        tileWarning.active = false;
                        tileWarning.dismissed = true;
                        switchBaseLayer(amap);
                        hideStatus();
                    }
                }
            ],
            dismissible: true,
            onDismiss: function () {
                tileWarning.active = false;
                tileWarning.dismissed = true;
            }
        });
    }

    map.on('baselayerchange', function () {
        if (tileWarning.active) {
            tileWarning.active = false;
            tileWarning.dismissed = true;
            hideStatus();
        }
    });
    function switchBaseLayer(target) {
        Object.keys(baseLayers).forEach(function (key) {
            var layer = baseLayers[key];
            if (map.hasLayer(layer)) {
                map.removeLayer(layer);
            }
        });
        target.addTo(map);
    }

    // ---------------------------------------------------------------------
    // 图例
    // ---------------------------------------------------------------------
    function parseDashArray(value) {
        if (Array.isArray(value)) {
            return value;
        }
        if (typeof value !== 'string') {
            return undefined;
        }
        var parts = value
            .split(/[, ]+/)
            .map(Number)
            .filter(function (number) {
                return Number.isFinite(number);
            });
        return parts.length ? parts : undefined;
    }

    var legendItems = [];
    LAYER_CONFIG.forEach(function (config) {
        if (!config.legend) {
            return;
        }
        var entries = Array.isArray(config.legend) ? config.legend : [config.legend];
        entries.forEach(function (entry) {
            legendItems.push({
                label: entry.label,
                type: entry.type,
                color: entry.color,
                weight: entry.weight,
                stroke: entry.stroke,
                fillColor: entry.fillColor,
                fillOpacity: entry.fillOpacity,
                // 图例插件用 Canvas setLineDash 绘制虚线，需要数字数组而不是 CSS 字符串
                dashArray: parseDashArray(entry.dashArray)
            });
        });
    });

    L.control
        .Legend({
            position: 'topleft',
            title: '图例',
            collapsed: true,
            legends: legendItems
        })
        .addTo(map);

    // ---------------------------------------------------------------------
    // 说明对话框
    // ---------------------------------------------------------------------
    if (aboutDialogEl && typeof aboutDialogEl.showModal === 'function') {
        var AboutControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function () {
                var container = L.DomUtil.create('div', 'leaflet-bar about-control');
                var button = L.DomUtil.create('button', 'about-control__button', container);
                button.type = 'button';
                button.textContent = '说明';
                button.title = '关于本页与数据说明';
                button.setAttribute('aria-label', '关于本页与数据说明');
                L.DomEvent.disableClickPropagation(container);
                L.DomEvent.on(button, 'click', function (event) {
                    L.DomEvent.stop(event);
                    aboutDialogEl.showModal();
                });
                return container;
            }
        });

        new AboutControl().addTo(map);

        aboutDialogEl.addEventListener('click', function (event) {
            if (event.target === aboutDialogEl) {
                aboutDialogEl.close();
            }
        });
    }

    // ---------------------------------------------------------------------
    // 控件本地化与 URL 视野同步
    // ---------------------------------------------------------------------
    localizeControl('.leaflet-control-zoom-in', '放大');
    localizeControl('.leaflet-control-zoom-out', '缩小');
    localizeControl('.leaflet-control-layers-toggle', '选择底图与图层');

    function localizeControl(selector, label) {
        var element = document.querySelector(selector);
        if (!element) {
            return;
        }
        element.setAttribute('title', label);
        element.setAttribute('aria-label', label);
    }

    function readViewFromHash() {
        var match = /^#(\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(
            window.location.hash
        );
        if (!match) {
            return null;
        }

        var zoom = Number(match[1]);
        var lat = Number(match[2]);
        var lng = Number(match[3]);
        if (
            !Number.isFinite(zoom) ||
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            zoom < 1 ||
            zoom > 20 ||
            Math.abs(lat) > 90 ||
            Math.abs(lng) > 180
        ) {
            return null;
        }

        return { center: [lat, lng], zoom: zoom };
    }

    function syncViewToHash() {
        var center = map.getCenter();
        var hash =
            '#' +
            Math.round(map.getZoom() * 100) / 100 +
            '/' +
            center.lat.toFixed(5) +
            '/' +
            center.lng.toFixed(5);
        if (window.location.hash !== hash) {
            window.history.replaceState(null, '', hash);
        }
    }
})();
