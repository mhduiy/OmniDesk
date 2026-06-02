# Widget Desktop 开发执行计划 (Tasklist)

> 状态：开发中
> 我们将严格遵循此计划进行开发、评审 (Review)、测试 (Test) 和验收 (Acceptance)。

## 阶段一：基础设施与视觉基座 (Infrastructure & UI Base) ✅
**目标**：完成前端工具链配置，搭建具有毛玻璃特效属性的基础页面。

- [x] **任务 1.1**：通过 `create-tauri-app` 初始化 React + TS 项目骨架。
- [x] **任务 1.2**：执行 `npm install` 安装基础依赖。
- [x] **任务 1.3**：集成 Tailwind CSS v4，配置全局的 Glassmorphism (毛玻璃) 颜色变量和工具类。
- [x] **任务 1.4**：开发前端主入口页面，实现基础的背景壁纸渲染逻辑和毛玻璃测试组件。
- [x] **评审与测试 (R&T)**：启动 `npm run tauri dev`，验收前端页面渲染且壁纸/毛玻璃样式生效。

## 阶段二：底层窗口挂载 (X11 Desktop Layer) ⏸️ (部分完成/调试模式)
**目标**：攻克最难的系统底层交互，让应用挂载在真实的桌面背景层。
*(注：根据当前策略，为方便前端与 Widget 开发调试，系统目前处于“普通窗口调试模式”，待核心功能完成后再一并开启桌面劫持)*

- [x] **任务 2.1**：在 Rust 侧添加 `x11rb` 与 `raw-window-handle` 依赖。
- [x] **任务 2.2**：定义 `DisplayBackend` Trait，并实现 `X11Backend`。
- [x] **任务 2.3**：在应用启动生命周期中，获取窗口句柄并注入 `_NET_WM_WINDOW_TYPE_DESKTOP` 等 X11 hints (代码已写好，暂注释以方便调试)。
- [ ] **任务 2.4**：处理多显示器逻辑（全屏覆盖主显示器）。
- [ ] **最终验收 (R&T)**：在集成阶段开启注入后，验证窗口不出现在任务栏，无法切换，永远沉底。

## 阶段三：核心引擎构建 (Grid & Iframe Sandbox) 🚀 (Next)
**目标**：前端实现网格布局，跑通安全的 iframe 组件沙盒通信。

- [x] **任务 3.1**：定义全局的 `window.__widgetBridge` TypeScript 接口规范。
- [x] **任务 3.2**：封装前端的 `IframeHost` React 组件，实现 `postMessage` 安全转发与双向绑定。
- [x] **任务 3.3**：实现基础的 `GridEngine` 布局，解析 JSON 数组来排列渲染 `IframeHost`。
- [x] **任务 3.4**：Rust 端实现鉴权入口（`invoke` 白名单指令分发中心）与 sysinfo 后台引擎。
- [x] **评审与测试 (R&T)**：编写 mock 数据测试 Iframe 渲染，验证能否成功向宿主发送并接收消息。

## 阶段四：跑通首个 MVP Widget (MVP Component) ✅
**目标**：通过真实组件验证整个架构链路。

- [x] **任务 4.1**：创建 `default-widgets/clock/` 目录，编写 `manifest.json` 和独立的纯 HTML/JS 时钟代码。
- [x] **任务 4.2**：宿主程序加载该时钟 Widget。
- [x] **任务 4.3**：在 Rust 端实现时间/系统状态推送服务，通过 Event 下发给时钟组件，打通双向通信。
- [x] **评审与测试 (R&T)**：桌面正常显示时钟，时间走动流畅，系统监控组件能够实时读取 Rust 底层硬件占用率。

## 阶段五：状态管理与持久化 (State & Persistence) ✅
**目标**：实现配置的热重载和桌面组件拖拽布局持久化。

- [x] **任务 5.1**：引入 `notify` 或使用文件系统，在 Rust 侧读取/写入 `layout.json`。
- [x] **任务 5.2**：实现配置解析并推送到前端，前端在挂载时进行布局恢复。
- [x] **任务 5.3**：实现编辑模式（`Alt+E`）：允许拖拽 Widget 改变位置与尺寸。
- [x] **任务 5.4**：拖拽结束后自动触发 IPC 通信，将新坐标保存至 `layout.json`。
- [x] **评审与测试 (R&T)**：热更新及布局状态恢复测试。

## 阶段六：打包集成与验收 (Integration & Packaging) 🚀 (Next)
**目标**：产出可供真实环境安装部署的 `.deb` 安装包。

- [ ] **任务 6.1**：配置 `tauri.conf.json` 中的 Debian 打包规则。
- [ ] **任务 6.2**：打包 Systemd 用户服务模板 `widget-desktop.service`。
- [ ] **任务 6.3**：编写 deb `postinst` 脚本，安装时屏蔽原有 desktop 进程。
- [ ] **最终验收 (Final Acceptance)**：安装包能平滑接管原生桌面环境。

## 附录：设计迭代记录 (Design Iteration Notes)
- **2026-06-02**：记录用户关于系统监控组件的设计建议：后期考虑将 CPU 和 RAM 的线性进度条替换为**“圆弧状 (Arc) / 环形进度条”**的样式，以提升视觉科技感和数据展示的丰富度。
