/* global L */
/**
 * 台湾周边空域互动地图
 *
 * 图层 / 图例 / 样式集中在本文件的 LAYER_CONFIG 中维护，新增图层时只需追加一项配置。
 * 图层数据按需加载：复选框勾选后才 fetch 对应 GeoJSON，取消勾选后数据保留在内存中。
 */
(function () {
    'use strict';

    var DEFAULT_VIEW = { center: [24, 120.9], zoom: 6 };

    var OSM_ATTRIBUTION =
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
    var CARTO_ATTRIBUTION =
        OSM_ATTRIBUTION +
        ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
    var AMAP_ATTRIBUTION =
        '&copy; <a href="https://www.amap.com/" target="_blank" rel="noopener">高德地图</a>';

    // 底图瓦片失败提示状态（提前声明，瓦片请求可能早于后续初始化完成）
    var tileWarning = { active: false, dismissed: false, label: '' };

    // ---------------------------------------------------------------------
    // 图层配置（顺序即叠放顺序：数组越靠后，绘制层级越高）
    // ---------------------------------------------------------------------
    var LAYER_CONFIG = [
        {
            id: 'adiz',
            name: '台湾地区防空识别区（ADIZ）',
            file: './geojson/adiz.geojson',
            style: { color: '#9985a7', weight: 2, opacity: 0.6, dashArray: '10, 0, 0, 10', fill: false },
            legend: {
                label: '台湾地区防空识别区（ADIZ）',
                type: 'polyline',
                color: '#9985a7',
                weight: 2,
                dashArray: '10, 0, 0, 10',
                stroke: true
            }
        },
        {
            id: 'tw_air',
            name: '台湾地区禁止、限制空域',
            file: './geojson/tw_air.geojson',
            style: { color: '#3488ff', weight: 3, opacity: 1, fill: false },
            legend: {
                label: '台湾地区禁止、限制空域',
                type: 'polyline',
                color: '#3488ff',
                weight: 3,
                stroke: true
            }
        },
        {
            id: '1996',
            name: '1996年3月 · 台湾海峡陆海空三军联合作战演习',
            file: './geojson/1996.geojson',
            style: { color: '#a4a2a2', weight: 3, fillColor: '#a4a2a2', fillOpacity: 0.3, fillRule: 'nonzero' },
            legend: { label: '1996年3月 · 台湾海峡陆海空三军联合作战演习', type: 'rectangle', fillColor: '#a4a2a2', fillOpacity: 0.3, stroke: false }
        },
        {
            id: '2022',
            name: '2022年8月 · 多军兵种联合战备警巡和实战化演练',
            file: './geojson/2022.geojson',
            style: { color: '#ab9c9b', weight: 3, fillColor: '#ab9c9b', fillOpacity: 0.3, fillRule: 'nonzero' },
            legend: {
                label: '2022年8月 · 多军兵种联合战备警巡和实战化演练',
                type: 'rectangle',
                fillColor: '#ab9c9b',
                fillOpacity: 0.3,
                stroke: false
            }
        },
        {
            id: '202304',
            name: '2023年4月 · 环台岛战备警巡和“联合利剑”演习',
            file: './geojson/202304.geojson',
            style: { color: '#b29594', weight: 3, fillColor: '#b29594', fillOpacity: 0.3, fillRule: 'nonzero' },
            legend: {
                label: '2023年4月/8月 · 环台岛战备警巡、“联合利剑”演习与联合演训',
                type: 'rectangle',
                fillColor: '#b29594',
                fillOpacity: 0.3,
                stroke: false
            }
        },
        {
            id: '202308',
            name: '2023年8月 · 海空联合战备警巡和联合演训',
            file: './geojson/202308.geojson',
            style: { color: '#b29594', weight: 3, fillColor: '#b29594', fillOpacity: 0.3, fillRule: 'nonzero' },
            // 与 2023 年 4 月共用图例，避免重复条目
            legend: null
        },
        {
            id: '2024A',
            name: '2024年5月 · “联合利剑—2024A”演习',
            file: './geojson/2024A.geojson',
            style: { color: '#b98f8d', weight: 3, fillColor: '#b98f8d', fillOpacity: 0.3, fillRule: 'nonzero' },
            legend: {
                label: '2024年5月 · “联合利剑—2024A”演习',
                type: 'rectangle',
                fillColor: '#b98f8d',
                fillOpacity: 0.3,
                stroke: false
            }
        },
        {
            id: '2024B',
            name: '2024年10月 · “联合利剑—2024B”演习',
            file: './geojson/2024B.geojson',
            style: { color: '#c08986', weight: 3, fillColor: '#c08986', fillOpacity: 0.3, fillRule: 'nonzero' },
            legend: {
                label: '2024年10月 · “联合利剑—2024B”演习',
                type: 'rectangle',
                fillColor: '#c08986',
                fillOpacity: 0.3,
                stroke: false
            }
        },
        {
            id: '2025B',
            name: '2025年12月 · “正义使命—2025”演习',
            file: './geojson/2025B.geojson',
            style: { color: '#c8827e', weight: 3, fillColor: '#c8827e', fillOpacity: 0.3, fillRule: 'nonzero' },
            legend: {
                label: '2025年12月 · “正义使命—2025”演习',
                type: 'rectangle',
                fillColor: '#c8827e',
                fillOpacity: 0.3,
                stroke: false
            }
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
    var carto = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: CARTO_ATTRIBUTION
    });
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
        'CartoDB 暗色': carto,
        '高德地图': amap,
        '高德卫星影像': amapSatellite
    };

    // 提前注册瓦片失败监听，避免首屏瓦片请求早于监听注册
    watchTileFailures(osm, 'OpenStreetMap');
    watchTileFailures(carto, 'CartoDB 暗色');

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

    // 默认显示全部图层；在图层控件创建之后添加，保证复选框状态同步
    LAYER_CONFIG.forEach(function (config) {
        overlayLayers[config.name].addTo(map);
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
                var geoLayer = L.geoJSON(data, {
                    pane: state.paneName,
                    style: state.config.style,
                    // 要素不单独响应点击，统一在 map click 中计算该点覆盖的所有图层
                    interactive: false
                });
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
                return distanceToLinePx(geometry.coordinates, latlng) <= LINE_HIT_TOLERANCE_PX;
            case 'MultiLineString':
                return geometry.coordinates.some(function (line) {
                    return distanceToLinePx(line, latlng) <= LINE_HIT_TOLERANCE_PX;
                });
            default:
                return false;
        }
    }

    function polygonHit(rings, latlng) {
        if (!rings.length) {
            return false;
        }
        // 面状图层按区域命中；不做像素距离兜底，避免低缩放级别把邻近区域也算进来
        return polygonContains(rings, latlng);
    }

    function polygonContains(rings, latlng) {
        if (!ringContains(rings[0], latlng)) {
            return false;
        }
        for (var i = 1; i < rings.length; i++) {
            // 内环（洞）内的点不算命中
            if (ringContains(rings[i], latlng)) {
                return false;
            }
        }
        return true;
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

        ['name', 'date', 'agency', 'activity'].forEach(function (key) {
            var value = properties[key];
            if (typeof value !== 'string') {
                return;
            }
            value = value.trim();
            // 部分数据的 name 字段是无意义的占位值
            if (!value || value.toLowerCase() === 'path') {
                return;
            }
            details.push(value);
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
        var item = {
            label: config.legend.label,
            type: config.legend.type,
            color: config.legend.color,
            weight: config.legend.weight,
            stroke: config.legend.stroke,
            fillColor: config.legend.fillColor,
            fillOpacity: config.legend.fillOpacity,
            // 图例插件用 Canvas setLineDash 绘制虚线，需要数字数组而不是 CSS 字符串
            dashArray: parseDashArray(config.legend.dashArray)
        };
        legendItems.push(item);
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
