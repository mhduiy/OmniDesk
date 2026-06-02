# 🌌 OmniDesk

> 一个高度可定制、纯本地驱动、基于沙盒隔离的极客桌面微件引擎 (Widget Desktop Engine)。

OmniDesk 旨在打破传统桌面的枯燥与死板，通过 **Tauri + Rust + React** 的强强联合，让你可以在桌面上挂载无限可能的生产力工具与信息面板。

## 🌟 核心特性 (Core Features)

- 🧩 **自研 24 列网格系统 (Grid Engine)**：支持任意拖拽、调整大小 (1x1 到 24x13)，支持碰撞检测与自动避让，完美契合你的桌面空间。
- 🛡️ **沙盒架构 (Sandbox Isolation)**：每一个 Widget 都在独立的 `iframe` 中运行，互相绝对隔离，彻底杜绝全局 CSS/JS 污染。
- 🌐 **底层网络穿透 (CORS-Free Proxy)**：通过 Rust 封装的 `fetch_proxy`，前端 Widget 可以无视浏览器的跨域限制 (CORS) 和部分 WAF 拦截，轻松抓取全网数据。
- 🎨 **极致的毛玻璃美学 (Glassmorphism)**：专门为现代混成器 (Compositors) 优化的深色模式与背景实时模糊效果，高级感拉满。
- 💾 **沙盒文件系统 (Local Persistence)**：提供 `widget_write_file` / `widget_read_file` 接口，让每个 Widget 都能安全、持久地将用户的配置（如 API Token）保存在系统本地。

## 📦 内置高阶微件 (Pre-built Widgets)

- **GitHub PR Monitor (4x4)**：支持多仓库轮播切换、自动拉取最新 PR 列表，并内置了 GitHub PAT (Personal Access Token) 的配置面板防限流。
- **全网实时热点 (4x4)**：基于底层爬虫与 DOM 解析，无视局域网防火墙封锁，实时抓取百度/微博等国民级热搜数据，并带有缩略图渲染。
- **AI 行业精选 (4x4)**：实时聚合业界最新 AI 资讯，极简设计。
- **System Monitor (4x2)**：车载仪表盘级别的双圆环 CPU & RAM 实时占用率监控。
- **其他微件**：Pomodoro 番茄钟、天气、AI 额度监控、快捷指令等。

## 🛠️ 技术栈 (Tech Stack)

- **框架**: [Tauri 2.0](https://tauri.app/) (提供极限的低内存占用与系统级 API)
- **后端**: Rust (`reqwest` 代理, `sysinfo` 性能监控)
- **前端 UI**: React 18 + TypeScript + Vite
- **样式**: Vanilla CSS + 无限可能的自绘 SVG

## 🚀 快速启动 (Getting Started)

### 环境要求
- Node.js >= 18
- Rust 工具链 (`rustup`, `cargo`)
- 相关的系统编译依赖 (如 Linux 下的 `libwebkit2gtk-4.1-dev`)

### 运行步骤
```bash
# 1. 安装前端依赖
npm install

# 2. 启动开发服务器与 Rust 后端
npm run tauri dev
```

## 📂 项目结构指南

- `src-tauri/src/lib.rs`：核心的 Rust 业务逻辑，包含 HTTP Proxy、文件持久化、系统信息采集。
- `src/components/GridEngine.tsx`：自研的 24列网格排版系统核心计算逻辑。
- `src/App.tsx`：桌面的主入口与微件坐标分布配置文件。
- `public/widgets/`：**所有 Widget 的老巢！** 
  > 想要开发一个新组件？只需要在这里新建一个文件夹，放入 `manifest.json` 和 `index.html`，无需修改任何主程序的编译代码即可热插拔生效！

## 📝 License
MIT License
