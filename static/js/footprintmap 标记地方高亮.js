/**
 * Footprint Map Core (AMap Only Version)
 * Author: Xiaoten(www.xiaoten.com)
 * License: MIT
 * Date: 2025-11-27
 * Update: Added iOS scroll fix, auto-hide arrows, and mobile panning fix.
 */

(function () {
    'use strict';

    // 1. 配置
    const CONFIG = {
        MARKER_STYLES: {
            sunset: 'linear-gradient(135deg, #ffb347, #ff6f61)',
            ocean: 'linear-gradient(135deg, #06beb6, #48b1bf)',
            violet: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
            forest: 'linear-gradient(135deg, #5ee7df, #39a37c)',
            amber: 'linear-gradient(135deg, #f6d365, #fda085)',
            citrus: 'linear-gradient(135deg, #fdfb8f, #a1ffce)'
        },
        MARKER_PRESETS: ['sunset', 'ocean', 'violet', 'forest', 'amber', 'citrus'],
        MAP_STYLES: {
            amap: {
                light: 'amap://styles/whitesmoke',
                dark: 'amap://styles/dark'
            }
        },
        MARKER_SIZE: 18,
        GRID_SIZE: 80,
        OFFSET_DESKTOP: 100,
        OFFSET_MOBILE: 140,

        // [点亮遮罩配置]
        REGION_MASK: {
            // 支持同时加载中国省份和世界国家边界
            GEOJSON_URLS: [
                './static/data/provinces.geojson',
                './static/data/world.geojson'
            ],
            // 排除高亮的标签
            EXCLUDE_TAGS: ['计划'], 
            
            // [修复点1] 绝对不要用 'transparent'，必须用纯色搭配 Opacity:0 隐形
            defaultStroke: '#ffffff',
            defaultStrokeOpacity: 0,
            defaultStrokeWeight: 0,
            defaultFill: '#ffffff',
            defaultFillOpacity: 0,
            
            // 已访问（被点亮）区域的高亮样式
            visitedStroke: '#5ee7df',
            visitedStrokeOpacity: 0.8,
            visitedStrokeWeight: 1, 
            visitedFill: '#06beb6',
            visitedFillOpacity: 0.07
        },
    };

    // --- 工具类 ---
    const Utils = {
        escapeHtml: (str) => String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]),
        isDarkMode: () => document.documentElement.classList.contains('dark'),
        parseCoords: (val) => {
            if (Array.isArray(val) && val.length >= 2) return { lng: parseFloat(val[0]), lat: parseFloat(val[1]) };
            if (typeof val === 'string') {
                const p = val.split(/[,，\s]+/).map(parseFloat).filter(n => !isNaN(n));
                return p.length >= 2 ? { lng: p[0], lat: p[1] } : null;
            }
            return null;
        },
        sanitizeLocation: (item, index) => {
            const coords = Utils.parseCoords(item.coordinates || item.coordinate || item.coords || item.position);
            if (!coords) return null;
            const markerPreset = item.markerPreset || CONFIG.MARKER_PRESETS[index % CONFIG.MARKER_PRESETS.length];
            let cats = item.categories || item.category || item.tags || ['未分类'];
            if (typeof cats === 'string') cats = [cats];
            return {
                id: `fp-${index}`,
                name: item.name || '未命名地点',
                lat: coords.lat,
                lng: coords.lng,
                description: item.description || '',
                date: item.date ? String(item.date) : '',
                url: item.url || '',
                urlLabel: item.urlLabel || '查看相关内容',
                photos: Array.isArray(item.photos) ? item.photos : [],
                categories: cats,
                markerPreset: markerPreset,
                markerStyle: CONFIG.MARKER_STYLES[markerPreset] ? `background:${CONFIG.MARKER_STYLES[markerPreset]}` : (item.markerStyle || '')
            };
        }
    };

    // --- Popup HTML 生成 ---
    const PopupBuilder = {
        build: (point) => {
            const h = Utils.escapeHtml;
            let html = `<div class="footprint-popup"><h4>${h(point.name)}</h4>`;
            if (point.date) html += `<p class="footprint-popup__meta">${h(point.date)}</p>`;
            if (point.categories.length) {
                html += `<div class="footprint-popup__tags">${point.categories.map(c => `<span class="footprint-popup__tag">${h(c)}</span>`).join('')}</div>`;
            }
            if (point.description) html += `<p>${h(point.description)}</p>`;
            if (point.url) {
                const label = point.urlLabel || '查看相关内容';
                html += `<div class="footprint-popup__links"><a class="footprint-popup__link" href="${h(point.url)}" target="_blank" rel="noopener">${h(label)}</a></div>`;
            }
            if (point.photos.length) {
                const nav = point.photos.length > 1 ?
                    '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--prev">&#10094;</button>' +
                    '<button type="button" class="footprint-popup__photos-btn footprint-popup__photos-btn--next">&#10095;</button>' : '';
                const slides = point.photos.map((src, i) =>
                    `<figure class="footprint-popup__slide"><div class="footprint-popup__slide-loader"></div><img src="${h(src)}" loading="lazy" alt="${h(point.name)}-${i+1}"></figure>`
                ).join('');
                html += `<div class="footprint-popup__photos"${point.photos.length > 1 ? ' data-carousel="true"' : ''}>${nav}<div class="footprint-popup__track">${slides}</div></div>`;
            }
            html += `</div>`;
            return html;
        }
    };

    // --- 灯箱组件 ---
    const PhotoViewer = (() => {
        let el, imgEl, prevBtn, nextBtn;
        let state = { images: [], index: 0 };
        let isInit = false;

        function init() {
            if (isInit) return;
            el = document.createElement('div');
            el.className = 'footprint-photo-viewer';
            el.innerHTML = `
                <div class="footprint-photo-viewer__mask"></div>
                <div class="footprint-photo-viewer__dialog">
                    <div class="footprint-photo-viewer__loader"></div>
                    <button type="button" class="footprint-photo-viewer__close">&times;</button>
                    <button type="button" class="footprint-photo-viewer__prev">&#10094;</button>
                    <img src="" alt="" />
                    <button type="button" class="footprint-photo-viewer__next">&#10095;</button>
                </div>`;
            document.body.appendChild(el);
            imgEl = el.querySelector('img');
            prevBtn = el.querySelector('.footprint-photo-viewer__prev');
            nextBtn = el.querySelector('.footprint-photo-viewer__next');

            el.addEventListener('click', (e) => {
                if (e.target === el || e.target.classList.contains('footprint-photo-viewer__mask') || e.target.classList.contains('footprint-photo-viewer__close')) close();
            });
            prevBtn.onclick = (e) => { e.stopPropagation(); prev(); };
            nextBtn.onclick = (e) => { e.stopPropagation(); next(); };
            document.addEventListener('keydown', (e) => {
                if (!el.classList.contains('is-visible')) return;
                if (e.key === 'Escape') close();
                if (e.key === 'ArrowLeft') prev();
                if (e.key === 'ArrowRight') next();
            });
            isInit = true;
        }

        function update() {
            if (!state.images.length) return;
            const loader = el.querySelector('.footprint-photo-viewer__loader');
            if (loader) loader.style.display = 'block';
            imgEl.classList.remove('loaded');
            imgEl.src = state.images[state.index];
            imgEl.onload = () => {
                if (loader) loader.style.display = 'none';
                imgEl.classList.add('loaded');
            };
            imgEl.onerror = () => {
                if (loader) loader.style.display = 'none';
                imgEl.classList.add('loaded');
            };
            prevBtn.style.display = state.images.length > 1 ? '' : 'none';
            nextBtn.style.display = state.images.length > 1 ? '' : 'none';
        }

        function open(images, idx = 0) {
            init();
            state.images = images;
            state.index = idx;
            update();
            const fs = document.fullscreenElement;
            if (fs && el.parentElement !== fs) fs.appendChild(el);
            else if (!fs && el.parentElement !== document.body) document.body.appendChild(el);
            el.classList.add('is-visible');
            document.documentElement.classList.add('footprint-photo-viewer-open');
        }

        function close() {
            el.classList.remove('is-visible');
            document.documentElement.classList.remove('footprint-photo-viewer-open');
        }
        function prev() { state.index = (state.index - 1 + state.images.length) % state.images.length; update(); }
        function next() { state.index = (state.index + 1) % state.images.length; update(); }
        return { open };
    })();

    document.addEventListener('load', (e) => {
        if (e.target.matches('.footprint-popup__slide img')) {
            const loader = e.target.parentElement.querySelector('.footprint-popup__slide-loader');
            if (loader) loader.remove();
            e.target.classList.add('loaded');
        }
    }, true);

    document.addEventListener('error', (e) => {
        if (e.target.matches('.footprint-popup__slide img')) {
            const loader = e.target.parentElement.querySelector('.footprint-popup__slide-loader');
            if (loader) loader.remove();
            e.target.classList.add('loaded');
        }
    }, true);

    document.addEventListener('click', (e) => {
        if (e.target.matches('.footprint-popup__photos-btn')) {
            e.stopPropagation();
            const track = e.target.parentElement.querySelector('.footprint-popup__track');
            const slides = track ? Array.from(track.querySelectorAll('.footprint-popup__slide')) : [];

            if (track && slides.length > 0) {
                const dir = e.target.classList.contains('footprint-popup__photos-btn--next') ? 1 : -1;
                const slideWidth = slides.length > 1
                    ? (slides[1].offsetLeft - slides[0].offsetLeft)
                    : (slides[0].offsetWidth + 8);
                const currentScroll = track.scrollLeft;
                const currentIndex = Math.round(currentScroll / slideWidth);
                let targetIndex = currentIndex + dir;
                targetIndex = Math.max(0, Math.min(targetIndex, slides.length - 1));
                track.scrollTo({ left: targetIndex * slideWidth, behavior: 'smooth' });
            }
            return;
        }

        if (e.target.matches('.footprint-popup__slide img')) {
            e.stopPropagation();
            const track = e.target.closest('.footprint-popup__track');
            const images = Array.from(track.querySelectorAll('img')).map(i => i.src);
            const idx = Array.from(track.querySelectorAll('img')).indexOf(e.target);
            PhotoViewer.open(images, idx);
        }
    }, true);

    // --- AMap Engine ---
    class AMapEngine {
        constructor(container, apiKey) {
            this.container = container;
            this.apiKey = apiKey;
            this.map = null;
            this.markers = [];
            this.clusterMarkers = [];
            this.clusterEnabled = true;
            this.markerData = [];
            this.infoWindow = null;
            this.ignoreMapClick = false;
            
            // 区域高亮遮罩相关
            this.regionPolygons = [];
            this.geoJsonLayers = []; 
            this.regionMaskEnabled = true;
        }

        async load() {
            if (window.AMap) return;
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = `https://webapi.amap.com/maps?v=2.0&key=${this.apiKey}`;
                s.onload = () => { window._AMapSecurityConfig = { securityJsCode: '' }; resolve(); };
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        init(locations) {
            const div = document.createElement('div');
            div.className = 'footprint-map__canvas';
            this.container.appendChild(div);

            this.map = new AMap.Map(div, {
                zoom: 4, center: [locations[0].lng, locations[0].lat],
                mapStyle: Utils.isDarkMode() ? CONFIG.MAP_STYLES.amap.dark : CONFIG.MAP_STYLES.amap.light,
                viewMode: '3D', 
                pitch: 0,       
                rotateEnable: false, 
                pitchEnable: false
            });

            AMap.plugin(['AMap.Scale', 'AMap.MoveAnimation'], () => {
                this.map.addControl(new AMap.Scale({ position: { bottom: '25px', left: '20px' } }));
            });

            this.infoWindow = new AMap.InfoWindow({
                anchor: 'bottom-center',
                offset: new AMap.Pixel(0, 0),
                autoMove: false,
                closeWhenClickMap: false
            });

            this.markerData = locations;

            // 异步加载所有配置的区域边界数据
            this.loadRegions();

            this.updateClusters();
            this.map.on('zoomend', () => this.updateClusters());

            this.map.on('click', () => {
                if (this.ignoreMapClick) return;
                this.infoWindow.close();
            });

            this.fitView();

            new MutationObserver(() => {
                this.map.setMapStyle(Utils.isDarkMode() ? CONFIG.MAP_STYLES.amap.dark : CONFIG.MAP_STYLES.amap.light);
            }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

            return {
                fitView: () => this.fitView(),
                zoomIn: () => this.map.zoomIn(),
                zoomOut: () => this.map.zoomOut(),
                resize: () => this.map.resize(),
                setClusterEnabled: (enabled) => { this.clusterEnabled = enabled; this.updateClusters(); },
                setRegionMaskEnabled: (enabled) => { this.setRegionMaskEnabled(enabled); },
                updateData: (data) => {
                    this.infoWindow.close(); 
                    this.markerData = data;
                    this.updateClusters();
                    this.fitView();
                    this.calculateAndStyleRegions(); 
                }
            };
        }

        updateClusters() {
            this.markers.forEach(m => this.map.remove(m));
            this.clusterMarkers.forEach(m => this.map.remove(m));
            this.markers = [];
            this.clusterMarkers = [];

            const zoom = this.map.getZoom();
            const shouldCluster = this.clusterEnabled && zoom < 10;

            if (!shouldCluster) {
                this.markerData.forEach(pt => this.createMarker(pt));
                return;
            }

            const clusters = {};
            this.markerData.forEach(pt => {
                const pixel = this.map.lngLatToContainer([pt.lng, pt.lat]);
                const key = `${Math.floor(pixel.x / CONFIG.GRID_SIZE)}_${Math.floor(pixel.y / CONFIG.GRID_SIZE)}`;
                (clusters[key] = clusters[key] || []).push(pt);
            });

            Object.values(clusters).forEach(points => {
                if (points.length === 1) this.createMarker(points[0]);
                else this.createClusterMarker(points);
            });
        }

        createMarker(pt) {
            const content = `<div class="footprint-marker footprint-marker--${pt.markerPreset}" style="${pt.markerStyle}"></div>`;
            const marker = new AMap.Marker({
                position: [pt.lng, pt.lat],
                content: content,
                offset: new AMap.Pixel(-9, -9),
                map: this.map
            });

            marker.on('click', () => {
                this.ignoreMapClick = true;
                setTimeout(() => { this.ignoreMapClick = false; }, 200);

                this.infoWindow.setContent(PopupBuilder.build(pt));
                this.infoWindow.open(this.map, [pt.lng, pt.lat]);

                setTimeout(() => {
                    const popupEl = this.container.querySelector('.footprint-popup');
                    if (popupEl) {
                        const track = popupEl.querySelector('.footprint-popup__track');
                        const btns = popupEl.querySelectorAll('.footprint-popup__photos-btn');
                        if (track && btns.length > 0 && track.scrollWidth <= track.clientWidth + 2) {
                            btns.forEach(btn => btn.style.display = 'none');
                        }
                    }
                }, 50);

                const isMobile = window.innerWidth < 640;
                const offsetY = isMobile ? CONFIG.OFFSET_MOBILE : CONFIG.OFFSET_DESKTOP;
                const pixel = this.map.lngLatToContainer([pt.lng, pt.lat]);
                const targetPixel = new AMap.Pixel(pixel.x, pixel.y - offsetY);
                const newCenter = this.map.containerToLngLat(targetPixel);
                this.map.panTo(newCenter);
            });
            this.markers.push(marker);
        }

        createClusterMarker(points) {
            const count = points.length;
            const centerLng = points.reduce((s, p) => s + p.lng, 0) / count;
            const centerLat = points.reduce((s, p) => s + p.lat, 0) / count;

            const [size, gradient, fontSize] = count < 5
                ? [38, 'linear-gradient(135deg, rgba(6,190,182,0.75), rgba(72,177,191,0.75))', '13px']
                : count < 10
                ? [42, 'linear-gradient(135deg, rgba(94,231,223,0.75), rgba(6,190,182,0.75))', '14px']
                : [46, 'linear-gradient(135deg, rgba(255,179,71,0.75), rgba(255,111,97,0.75))', '15px'];

            const content = `<div style="width:${size}px;height:${size}px;background:${gradient};border-radius:50%;border:1px solid rgba(255,255,255,0.4);box-shadow:0 4px 12px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${fontSize};cursor:pointer">${count}</div>`;

            const marker = new AMap.Marker({
                position: [centerLng, centerLat],
                content: content,
                offset: new AMap.Pixel(-size/2, -size/2),
                map: this.map
            });

            marker.on('click', () => {
                this.ignoreMapClick = true;
                setTimeout(() => { this.ignoreMapClick = false; }, 200);
                this.map.setZoomAndCenter(this.map.getZoom() + 2, [centerLng, centerLat]);
            });
            this.clusterMarkers.push(marker);
        }

        fitView() {
            if (!this.markerData.length) return;
            const path = this.markerData.map(p => [p.lng, p.lat]);
            const poly = new AMap.Polyline({ path: path, strokeOpacity: 0, map: this.map });
            this.map.setFitView([poly], false, [60, 80, 60, 80]);
            this.map.remove(poly);
        }

        // ================= 核心：空间计算与高亮点亮逻辑 =================
        
        async loadRegions() {
            try {
                const fetchPromises = CONFIG.REGION_MASK.GEOJSON_URLS.map(url => 
                    fetch(url).then(res => res.json()).catch(e => {
                        console.warn(`加载区域数据失败: ${url}`, e);
                        return null;
                    })
                );
                const results = await Promise.all(fetchPromises);
                const validGeojsons = results.filter(g => g !== null);
                this.drawRegions(validGeojsons);
            } catch (e) {
                console.error('解析区域数据异常:', e);
            }
        }

        isMarkerValidForHighlight(pt) {
            if (!pt.categories || pt.categories.length === 0) return true;
            return !pt.categories.some(tag => CONFIG.REGION_MASK.EXCLUDE_TAGS.includes(tag));
        }

        drawRegions(geojsonDataArray) {
            this.clearRegions();

            AMap.plugin('AMap.GeoJSON', () => {
                geojsonDataArray.forEach(geojsonData => {
                    const layer = new AMap.GeoJSON({
                        geoJSON: geojsonData,
                        getPolygon: (geojson, lnglats) => {
                            const polygon = new AMap.Polygon({
                                path: lnglats,
                                cursor: 'default',
                                bubble: true,
                                strokeOpacity: 0, 
                                fillOpacity: 0,
                                zIndex: 1 
                            });
                            
                            // 挂载几何数据
                            polygon._geoJsonGeometry = geojson.geometry;
                            // 必须把属性也挂载上去，否则下面拦截拿不到名字！
                            polygon._properties = geojson.properties || {};
                            
                            this.regionPolygons.push(polygon);
                            return polygon;
                        }
                    });
                    this.geoJsonLayers.push(layer);
                });

                this.calculateAndStyleRegions();

                if (this.regionMaskEnabled) {
                    this.geoJsonLayers.forEach(layer => this.map.add(layer));
                }
            });
        }

        calculateAndStyleRegions() {
            if (this.regionPolygons.length === 0) return;

            const { REGION_MASK } = CONFIG;
            const defaultOpts = {
                strokeColor: REGION_MASK.defaultStroke,
                strokeOpacity: REGION_MASK.defaultStrokeOpacity,
                strokeWeight: REGION_MASK.defaultStrokeWeight,
                fillColor: REGION_MASK.defaultFill,
                fillOpacity: REGION_MASK.defaultFillOpacity,
                zIndex: 1 
            };
            const visitedOpts = {
                strokeColor: REGION_MASK.visitedStroke,
                strokeOpacity: REGION_MASK.visitedStrokeOpacity,
                strokeWeight: REGION_MASK.visitedStrokeWeight,
                fillColor: REGION_MASK.visitedFill,
                fillOpacity: REGION_MASK.visitedFillOpacity,
                zIndex: 10 
            };

            const validMarkers = this.markerData.filter(pt => this.isMarkerValidForHighlight(pt));

            // [新增] 纯数学射线法：判断点是否在 GeoJSON 多边形内 (无视 AMap 引擎 Bug)
            const isPointInGeoJSON = (pt, geometry) => {
                const p = [pt.lng, pt.lat];
                const type = geometry.type;
                const coords = geometry.coordinates;

                const pointInRing = (p, ring) => {
                    let inside = false;
                    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                        let xi = ring[i][0], yi = ring[i][1];
                        let xj = ring[j][0], yj = ring[j][1];
                        
                        // 核心射线算法
                        let intersect = ((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                        
                        // 极限容错：如果点正好在矩形的边框或顶点上（完美解决占位数据的压线问题）
                        if (Math.abs(p[0] - xi) < 0.0001 && Math.abs(p[1] - yi) < 0.0001) return true;
                    }
                    return inside;
                };

                const pointInPoly = (p, polyCoords) => {
                    if (!pointInRing(p, polyCoords[0])) return false;
                    // 排除镂空飞地
                    for (let i = 1; i < polyCoords.length; i++) {
                        if (pointInRing(p, polyCoords[i])) return false;
                    }
                    return true;
                };

                if (type === 'Polygon') return pointInPoly(p, coords);
                if (type === 'MultiPolygon') return coords.some(poly => pointInPoly(p, poly));
                return false;
            };

            let visitedCount = 0;

            this.regionPolygons.forEach(polygon => {
                let isVisited = false;
                
                // 防止世界地图的“中国”大板块覆盖省份细节
                // 检查当前多边形的名称，如果是中国，直接跳过点亮（让省份数据去负责展示）
                const pName = String(polygon._properties?.name || polygon._properties?.ADMIN || polygon._properties?.name_zh || '').toLowerCase();
                if (pName === '中国' || pName === 'china' || pName === "people's republic of china" || pName === '中华人民共和国') {
                    polygon.setOptions(defaultOpts);
                    return; // 结束当前循环，让省份数据去负责展示
                }

                // 优先使用纯数学计算，万无一失
                if (polygon._geoJsonGeometry) {
                    isVisited = validMarkers.some(pt => isPointInGeoJSON(pt, polygon._geoJsonGeometry));
                } else {
                    // 降级方案
                    const validLngLats = validMarkers.map(pt => new AMap.LngLat(pt.lng, pt.lat));
                    isVisited = validLngLats.some(lnglat => polygon.contains(lnglat));
                }

                if (isVisited) {
                    visitedCount++;
                    polygon.setOptions(visitedOpts);
                } else {
                    polygon.setOptions(defaultOpts);
                }
            });

            console.log(`🌍 [FootprintMap 诊断] 当前显示 ${validMarkers.length} 个有效足迹，成功点亮了 ${visitedCount} 块区域。`);
        }

        clearRegions() {
            this.geoJsonLayers.forEach(layer => {
                if (this.map) this.map.remove(layer);
            });
            this.geoJsonLayers = [];
            this.regionPolygons = [];
        }

        setRegionMaskEnabled(enabled) {
            this.regionMaskEnabled = enabled;
            this.geoJsonLayers.forEach(layer => {
                if (enabled) {
                    this.map.add(layer);
                } else {
                    this.map.remove(layer);
                }
            });
        }
    }

    // --- 主加载流程 ---
    async function initMap(container) {
        const { json: dataUrl, amapKey: apiKey } = container.dataset;

        if (!apiKey) {
            container.innerHTML = `<div class="footprint-map__error">配置错误：缺少 API Key (data-amap-key)</div>`;
            return;
        }

        try {
            const res = await fetch(dataUrl);
            const raw = await res.json();
            const list = (raw.locations || raw).map(Utils.sanitizeLocation).filter(Boolean);

            const engine = new AMapEngine(container, apiKey);
            await engine.load();
            const controls = engine.init(list);

            renderUI(container, list, controls);
        } catch (e) {
            container.innerHTML = `<div class="footprint-map__error">加载失败: ${e.message}</div>`;
        } finally {
            container.classList.remove('footprint-map--loading');
        }
    }

    // 渲染 UI (筛选器 + 控件)
    function renderUI(container, allData, controls) {
        const cats = [...new Set(allData.flatMap(d => d.categories))].sort();
        if (cats.length > 1) {
            const wrap = document.createElement('div');
            wrap.className = 'footprint-map__filters';
            const mkBtn = (txt, val) => {
                const b = document.createElement('button');
                b.className = `footprint-map__filter-btn${val === 'all' ? ' is-active' : ''}`;
                b.textContent = txt;
                b.onclick = () => {
                    wrap.querySelectorAll('.is-active').forEach(e => e.classList.remove('is-active'));
                    b.classList.add('is-active');
                    const filtered = val === 'all' ? allData : allData.filter(d => d.categories.includes(val));
                    controls.updateData(filtered);
                };
                wrap.appendChild(b);
            };
            mkBtn('全部足迹', 'all');
            cats.forEach(c => mkBtn(c, c));
            container.appendChild(wrap);
        }

        const ctrlWrap = document.createElement('div');
        const isMobile = window.matchMedia('(max-width: 640px)').matches;
        ctrlWrap.className = `footprint-map-ctrls ${isMobile ? 'is-mobile' : 'is-desktop'}`;

        const icons = {
            full: '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
            exit: '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
            reset: '<svg viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>',
            plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
            minus: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>'
        };

        const addBtn = (html, act) => {
            const b = document.createElement('button');
            b.className = 'footprint-ctrl-btn';
            b.innerHTML = html;
            b.onclick = (e) => { e.currentTarget.blur(); act(e, b); };
            ctrlWrap.appendChild(b);
        };

        addBtn(icons.full, (e, btn) => {
            const full = container.classList.toggle('is-fullscreen');
            btn.innerHTML = full ? icons.exit : icons.full;
            setTimeout(() => controls.resize(), 100);
            if(full && container.requestFullscreen) container.requestFullscreen().catch(()=>{});
            else if(!full && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
        });
        document.addEventListener('fullscreenchange', () => {
             const isFull = document.fullscreenElement === container;
             container.classList.toggle('is-fullscreen', isFull);
             setTimeout(() => controls.resize(), 100);
        });

        addBtn(icons.reset, () => controls.fitView());
        addBtn(icons.plus, () => controls.zoomIn());
        addBtn(icons.minus, () => controls.zoomOut());
        container.appendChild(ctrlWrap);

        const togWrap = document.createElement('div');
        togWrap.className = 'footprint-map__cluster-toggle';

        const label = document.createElement('span');
        label.className = 'toggle-label';
        label.textContent = '集群显示';

        const btn = document.createElement('button');
        btn.className = 'toggle-switch';
        btn.innerHTML = '<span class="toggle-knob"></span>';

        let enabled = true;
        btn.onclick = () => {
            enabled = !enabled;
            btn.classList.toggle('is-off', !enabled);
            controls.setClusterEnabled(enabled);
        };

        togWrap.append(label, btn);
        container.appendChild(togWrap);

        // [点亮遮罩开关]
        const provTogWrap = document.createElement('div');
        provTogWrap.className = 'footprint-map__province-toggle';

        const provLabel = document.createElement('span');
        provLabel.className = 'toggle-label';
        provLabel.textContent = '省份/国界高亮';

        const provBtn = document.createElement('button');
        provBtn.className = 'toggle-switch';
        provBtn.innerHTML = '<span class="toggle-knob"></span>';

        let provEnabled = true;
        provBtn.onclick = () => {
            provEnabled = !provEnabled;
            provBtn.classList.toggle('is-off', !provEnabled);
            controls.setRegionMaskEnabled(provEnabled);
        };

        provTogWrap.append(provLabel, provBtn);
        container.appendChild(provTogWrap);
    }

    document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.footprint-map').forEach(initMap));

    if (!window.FootprintMap) window.FootprintMap = {};
    window.FootprintMap.bootstrapMap = function (el) {
        const container = (typeof el === 'string') ? document.querySelector(el) : el;
        if (!container) return Promise.reject(new Error('container not found'));
        return initMap(container);
    };
    window.FootprintMap.init = function () {
        document.querySelectorAll('.footprint-map').forEach(initMap);
    };
})();