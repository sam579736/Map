# XiaoTen-FootprintMap（小十足迹地图）

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![AMap](https://img.shields.io/badge/AMap-2.0-06beb6)](https://lbs.amap.com/)
[![Demo](https://img.shields.io/website?url=https%3A%2F%2Ffootprintmap.xiaoten.com%2F&label=Demo)](https://footprintmap.xiaoten.com/)

一个基于高德地图的纯前端足迹地图组件，支持标记集群、分类筛选、照片轮播以及全球区域（国家/省份）智能联动高亮功能。

简体中文 | [在线演示](https://footprintmap.xiaoten.com/)

项目地址：https://github.com/Jiosanity/XiaoTen-FootprintMap


## ✨ 特性

- 🗺️ **纯静态实现** - 纯前端，无需后端，仅需引入 JS/CSS 文件
- 📍 **全球区域高亮联动** - 全新的高亮架构设计，原生支持全球国家边界与中国省级行政区划的叠加渲染。提供「标记永久点亮」与「鼠标悬浮高亮」两种插件模式供自由插拔。
- 🛡️ **极致容错解析** - 突破高德 WebGL 引擎对 `MultiPolygon`（复杂群岛/飞地）的渲染瓶颈。采用纯数学射线算法手动降维拆解，彻底消灭“破面拉丝”和隐形报错 Bug。
- 🎯 **智能标记集群** - 网格算法自动合并附近标记，提升大数据量展示性能
- 🏷️ **分类与智能排除** - 自动提取分类标签，支持一键筛选。内置标签排除引擎，可通过配置指定标签（如“计划”）避免被点亮。
- 🌓 **主题自适应** - 完美适配亮色/暗色主题，自动同步切换
- 📸 **照片展示** - 支持多图轮播和灯箱放大查看
- 📱 **移动端优化** - 响应式设计，触控友好
- 🎨 **自定义标记** - 6种预设渐变色 + 自定义颜色支持
- ⚡ **插件化性能优化** - 精简代码，基于状态驱动优化图层渲染，核心与高亮逻辑彻底解耦，按需加载
- 🧭 **自定义控件** - 在地图右上角（或移动端右下）提供「重载视图 / 全屏 / 放大 / 缩小」四个控件，避免和地图原生控件重叠并支持暗黑主题。
- 🔌 **即插即用** - 支持任何网站：WordPress、Hexo、Jekyll、Hugo 等

## 📸 演示

在线演示：

[https://footprintmap.xiaoten.com/](https://footprintmap.xiaoten.com/)

提示：演示页右上角“🔑 API Key”按钮可快速填写并保存你的高德 Key，页面会自动使用此 Key 加载地图。

[足迹-小十的个人博客](https://www.xiaoten.com/pages/footprints/)

## 🚀 快速开始

### 1. 引入文件（自动引导，无需写初始化代码）

在 HTML 页面中引入 CSS/JS，并放置一个容器元素。组件会自动扫描类名为 `.footprint-map` 的元素并初始化。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>我的足迹地图</title>
  <link rel="stylesheet" href="css/footprintmap.css">
  <style>
    .footprint-map { width: 100%; height: 600px; }
  </style>
  <script>
    // 可选：在运行时写入本地存储中的 Key（也可直接在容器 data-amap-key 上写）
    localStorage.setItem('amapKey', '你的高德地图APIKey');
  </script>
  
  <script defer src="js/utils.js"></script>
  <script defer src="js/footprintmap.js"></script>
  <script defer src="js/plugin-visited.js"></script>
  <script defer src="js/plugin-hover.js"></script>

  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <link rel="icon" href="data:,">
  <link rel="preconnect" href="[https://webapi.amap.com](https://webapi.amap.com)">
  <link rel="dns-prefetch" href="[https://webapi.amap.com](https://webapi.amap.com)">
  <link rel="dns-prefetch" href="[https://a.amap.com](https://a.amap.com)">
  <link rel="dns-prefetch" href="[https://vdata.amap.com](https://vdata.amap.com)">
  <link rel="dns-prefetch" href="[https://restapi.amap.com](https://restapi.amap.com)">
  <link rel="dns-prefetch" href="[https://lbs.amap.com](https://lbs.amap.com)">
  <link rel="dns-prefetch" href="[https://webapi.amap.com](https://webapi.amap.com)">
  <link rel="dns-prefetch" href="[https://jiosanity.github.io](https://jiosanity.github.io)">
  <link rel="dns-prefetch" href="[https://cdn.jsdelivr.net](https://cdn.jsdelivr.net)">
  <link rel="dns-prefetch" href="[https://fastly.jsdelivr.net](https://fastly.jsdelivr.net)">
  <link rel="dns-prefetch" href="[https://gcore.jsdelivr.net](https://gcore.jsdelivr.net)">
</head>
<body>
  <div class="footprint-map"
       data-json="data/footprints.json"
       data-amap-key="可选：直接写你的Key"></div>
</body>
</html>

```

### 2. 准备数据

创建 `data/footprints.json` 文件：

```json
{
  "locations": [
    {
      "name": "北京",
      "coordinates": "116.4074,39.9042",
      "description": "中国的首都",
      "date": "2024-05-01",
      "categories": ["2024", "旅行"],
      "markerColor": "sunset"
    }
  ]
}

```

*提示：为支持区域遮罩联动功能，请确保项目中包含 `provinces.geojson` (中国省份) 或 `world.geojson` (全球国家) 数据文件（默认读取路径可通过配置文件修改）。*

### 3. 获取 API Key

前往 [高德开放平台](https://console.amap.com/) 注册并创建应用，获取 Web 端 JS API Key。

### 4. 完成！

直接打开 HTML 文件或通过本地服务器访问即可看到地图。详细文档请查看 [安装指南](docs/installation.md)。

## 📖 文档

* [安装指南](docs/installation.md) - 详细的集成步骤
* [数据格式](docs/data-format.md) - JSON 数据结构
* [API 文档](docs/api.md) - JavaScript API 参考
* [自定义样式](docs/customization.md) - CSS 自定义指南

## 🎨 标记颜色预设

| 预设名称 | 效果 | 使用方式 |
| --- | --- | --- |
| sunset | → | `"markerColor": "sunset"` |
| ocean | → | `"markerColor": "ocean"` |
| violet | → | `"markerColor": "violet"` |
| forest | → | `"markerColor": "forest"` |
| amber | → | `"markerColor": "amber"` |
| citrus | → | `"markerColor": "citrus"` |

也可以使用自定义颜色：`"markerColor": "#ff6b6b"` 或 `"markerColor": "rgb(255,107,107)"`

## 🔧 使用要点

* 容器：使用类名 `footprint-map` 的元素作为地图容器，建议通过 CSS 设定高度。
* 数据：通过 `data-json` 指定 JSON 数据地址。
* Key：通过 `data-amap-key` 或 `localStorage('amapKey')` 提供高德 Key。
* 初始化：无需手写 JS 初始化，组件会在 DOMContentLoaded 后自动扫描并挂载。
* 插件配置：在 `footprintmap.js` 顶部的 `CONFIG.HIGHLIGHT.mode` 中可配置默认开启的高亮插件。
* 主题：当页面根节点存在 `.dark` 类时自动切换为暗色地图样式。

## 🛠️ 技术栈

* [高德地图 Web JS API 2.0](https://lbs.amap.com/api/jsapi-v2/summary) - 地图服务
* Vanilla JavaScript (ES6+) - 无框架依赖
* CSS3 - 响应式样式

## 🐛 Bug修复

### 修复复杂群岛多边形（MultiPolygon）的 WebGL 破面拉丝问题

* **问题现象**: 高德原生引擎在渲染包含大量海外飞地和岛屿的 GeoJSON 数据（如美国、英国、印度以及中国沿海省份）时，会在海面上生成错误相连的直线网格阴影，并导致地图事件系统崩溃。
* **解决方案**: 在插件底层引入了强力拦截机制，抛弃高德原生的自动解析。手动将 `MultiPolygon` 拆解为独立的一维子多边形对象分别绘制，并运用代理模式和纯数学射线算法，在逻辑层将其与国家/省份名称进行隐式绑定。完美实现了鼠标事件和数据碰撞的同步高亮，从根源上消灭了任何破面重影。

### 修复分类筛选时的视野过度缩放问题

* **问题现象**: 当启用“集群模式”时，如果筛选的分类下的所有地点在地理上非常集中，它们会被聚合为一个或极少数几个集群点。此时地图的 `setFitView` 功能会因目标过少而判断失误，导致地图被无限放大，视野崩溃。
* **解决方案**: 重构了 `renderMap` 函数的核心逻辑。创建了一个名为 `fitViewToPoints` 的辅助函数，该函数不再依赖于地图上实际渲染出的标记点或集群点来调整视野。而是基于筛选后的原始地理坐标数据，通过在地图上添加一个临时的、不可见的覆盖物（`AMap.Polyline`）来精确计算出能包含所有目标点的地理边界，然后命令地图缩放至此边界，完成后再移除该临时覆盖物。这从根本上解决了因集群聚合导致视野判断错误的问题，确保了在任何数据分布下都能提供稳定、正确的缩放体验。

## 📝 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的版本更新历史。

### 最新版本 v1.4.0 (2026-03-15)

* ✨ **新增全球区域联动**：引入全新的高亮插件架构，全面支持全球国家边界与中国省份（GeoJSON）的精准叠加高亮。
* 🧩 **双模式热插拔插件**：彻底解耦核心代码，拆分出「标记永久点亮 (`plugin-visited.js`)」与「鼠标悬浮高亮 (`plugin-hover.js`)」两大独立专属插件，主配置支持一键无缝切换。
* 🛡️ **底层渲染级修复**：绕开高德 WebGL 引擎对 `MultiPolygon` 处理的性能地雷，运用纯数学射线空间计算与手动降维拆解，完美解决复杂岛屿地形造成的“破面拉丝”和地图静默报错 Bug。
* 🎯 **智能标签排除引擎**：新增指定标签（如“计划”）的排除计算，未成行的足迹绝对不会污染地图的访问高亮状态。

### v1.3.0 (2025-11-19)

* 🚀 **项目开源**：源码已托管至 `https://github.com/Jiosanity/XiaoTen-FootprintMap`，包含示例数据、文档与演示页面。
* 🛠️ **新增可视化编辑器（editor.html）**：提供本地交互式编辑体验，支持地图拾取坐标、添加/编辑地点、导入示例/JSON、生成并下载 JSON、复制到剪贴板以及即时预览（含聚类、筛选、主题同步）。
* 📱 **编辑器移动端优化**：修复按钮换行缩进、日期行在窄屏保持一行、图片查看器与轮播滚动优化等交互细节。
* ⚡ 其它若干细节修复与文档补充。

### v1.2.0 (2025-11-19)

* ✨ 新增 2D 地图模式，禁用旋转和倾斜
* ⚡ 代码精简：JS 从 879 行优化到 475 行（减少 45.9%）
* 🎨 完善黑暗模式适配（缩放控件和比例尺）
* 🐛 修复多项 UI 细节问题

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。

## 🙏 致谢

* 灵感来源：[王叨叨的足迹管理插件](https://wangdaodao.com/20251117/amap-track.html)
* 地图服务：[高德开放平台](https://lbs.amap.com/)
* 边界数据支持：[Natural Earth](https://www.naturalearthdata.com/)

## 📧 联系方式

* 作者：xiaoten
* 网站：[xiaoten.com](https://www.xiaoten.com/)
* Issue：[GitHub Issues](https://github.com/Jiosanity/XiaoTen-FootprintMap/issues)

---

如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！