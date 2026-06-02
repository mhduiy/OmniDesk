# Widget Desktop — 架构设计文档

> 状态：草稿 v0.1  
> 目标：指导基于 Tauri 2.x 的 Widget Desktop 核心研发过程，确立模块边界、数据流向与安全机制。

---

## 1. 架构设计原则

本项目架构设计遵循现代桌面软件与高可扩展性框架的最佳实践：

1. **关注点分离 (Separation of Concerns)**：
   - 业务逻辑与系统交互收敛于 Rust 后端。
   - 视觉呈现与网格布局收敛于 Web 前端。
   - 配置（业务数据）与布局（渲染数据）物理隔离。
2. **依赖倒置与抽象 (Dependency Inversion)**：
   - 绝不让上层业务代码直接调用特定显示协议的 API。所有底层窗口交互必须通过抽象的 `DisplayBackend` Trait 进行，为未来无缝切换 Wayland 铺平道路。
3. **沙盒化与隔离 (Sandboxing & Isolation)**：
   - 将 Widget 视为不受信的第三方插件。通过 `iframe` 物理隔离渲染上下文，通过白名单桥接（Bridge）隔离系统权限。
4. **视觉优先与高性能**：
   - 将 CSS 渲染层的毛玻璃特效下放给 WebView 引擎（利用 KWin 混成器），降低 CPU 开销。

---

## 2. 系统总体架构图

系统采用经典的**主从架构 (Host-Plugin)** 和 **前后端分离架构 (Rust-Core + Web-UI)**，整体划分为三层：

```mermaid
graph TD
    subgraph "Widget 层 (Plugins)"
        W1[时钟 Widget<br/>iframe]
        W2[系统监控 Widget<br/>iframe]
        W3[第三方 Widget<br/>iframe]
    end

    subgraph "Web 前端 (宿主 UI)"
        UI_Grid[网格布局引擎 Grid Engine]
        UI_Manager[Widget 生命周期管理器]
        UI_Bridge[前端 IPC 代理]
        
        W1 -->|postMessage| UI_Bridge
        W2 -->|postMessage| UI_Bridge
        W3 -->|postMessage| UI_Bridge
        
        UI_Grid -.-> UI_Manager
    end

    subgraph "Rust 后端 (Core 系统层)"
        R_IPC[Tauri Command/Event Bus]
        R_Config[配置与状态管理器]
        R_Display[DisplayBackend 抽象层]
        
        subgraph "Display Implementations"
            X11[X11 Backend<br/>x11rb]
            Wayland[Wayland Backend<br/>预留]
        end
        R_Display --> X11
        R_Display --> Wayland
    end

    UI_Bridge <==>|Tauri IPC (JSON)| R_IPC
    R_IPC <--> R_Config
    R_IPC <--> R_Display
```

---

## 3. 核心子系统详细设计

### 3.1 显示后端抽象层 (DisplayBackend)

为了屏蔽底层操作系统的差异，Rust 后端定义统一的 Trait：

```rust
pub trait DisplayBackend {
    /// 初始化并挂载到桌面层
    fn mount_to_desktop(&self, window: &tauri::Window) -> Result<(), Error>;
    /// 获取当前屏幕拓扑信息
    fn get_monitors(&self) -> Result<Vec<MonitorInfo>, Error>;
    /// 监听屏幕插拔等事件
    fn on_display_change(&self, callback: Box<dyn Fn() + Send + Sync>);
}
```
*   **X11 实现**：调用 `x11rb` 获取 XID，设置 `_NET_WM_WINDOW_TYPE_DESKTOP` 等 hint。
*   **依赖注入**：在 Tauri 启动阶段，根据当前环境变量（如 `$WAYLAND_DISPLAY`）动态实例化具体的 Backend。

### 3.2 配置与状态管理器 (State Manager)

分为两个独立的数据源，使用 `notify` crate 实现文件监听并热重载：

1. **`config.toml` (配置引擎)**：
   - 职责：读取全局系统设置、壁纸偏好、Widget 开关及鉴权密钥（API Key）。
   - 机制：反序列化为 Rust 强类型 Struct，通过 Tauri State 管理。
2. **`layout.json` (布局引擎)**：
   - 职责：只记录 Widget 的 `id`、`instance_id`、`x`、`y`、`w`、`h`。
   - 机制：前端在编辑模式下拖拽结束后，调用 Rust Command 直接落盘。启动时，前端向 Rust 请求该文件渲染网格。
3. **配置导入与导出 (Import/Export)**：
   - 职责：允许用户备份和在多台机器间无缝迁移桌面布局与配置。
   - 机制：由 Rust 提供 `export_config` 和 `import_config` 命令。导出时，后端将 `config.toml`、`layout.json` 及其引用的本地资源打包为 `.wdpack` (本质为 zip 格式)；导入时校验合法性后解压覆盖到对应的 XDG 目录，并利用 `notify` 监听机制自动触发全系统的热重载。

### 3.3 Widget 隔离与通信桥接 (IPC Bridge)

这是最核心的安全与扩展设计。

**1. 渲染隔离**：
前端宿主（如 React 项目）中，渲染 Widget 的伪代码如下：
```jsx
// 宿主直接嵌入 iframe，确保 CSS/JS 互不干扰
<iframe 
  src={`tauri://localhost/widgets/${widget.id}/index.html?instanceId=${widget.instanceId}`}
  style={{ backdropFilter: 'blur(10px)' }} // 毛玻璃特效由宿主统一控制
  sandbox="allow-scripts allow-same-origin"
/>
```

**2. 安全通信桥 (Window Bridge)**：
Widget 内部的 JS 不能直接调用 Tauri API。通信流程如下：
*   **Widget -> 宿主**：通过原生的 `window.parent.postMessage`。
*   **宿主 -> Tauri**：宿主收到 Message 后，进行校验，然后调用 `invoke` 发给 Rust。
*   **Tauri -> Widget**：Rust 发送 `WindowEvent` 给宿主，宿主通过 `iframe.contentWindow.postMessage` 下发给指定的 Widget。

**宿主注入给 Widget 的全局对象规范**：
```javascript
window.__widgetBridge = {
    // 获取由 config.toml 下发的配置
    getConfig: async () => { ... },
    // 监听后端高频推送（如 CPU 占用）
    on: (eventName, callback) => { ... },
    // 调用受限后端指令（必须在白名单内）
    invoke: async (command, args) => {
        return new Promise((resolve) => {
             // 封装 postMessage 逻辑
        });
    }
};
```

### 3.4 系统集成与打包部署 (System Integration & Packaging)

本项目重点支撑 Debian 系桌面，通过 `.deb` 格式进行系统级分发与劫持，架构设计如下：

1. **Tauri Bundler 集成**：复用 Tauri `tauri.conf.json` 的 `deb` 构建目标，自动打包 Rust 二进制文件、前端构建产物及默认 Widget 资产到 `/usr/share/widget-desktop`。
2. **Systemd 常驻托管**：
   - 随包部署 user 级服务文件 `/usr/lib/systemd/user/widget-desktop.service`。
   - 利用 `Restart=on-failure` 实现**崩溃自愈**，保证桌面进程的高可用性。
3. **桌面环境劫持脚本**：
   - 在 deb 的 `postinst` (安装后) 生命周期脚本中，自动检测当前操作系统的默认桌面挂载组件（如 Deepin 的 `dde-desktop` 或 XFCE 的 `xfdesktop`）。
   - 自动执行 `systemctl --user mask dde-desktop` 进行屏蔽，并启用本应用的服务，实现环境的无缝接管。

---

## 4. 关键业务数据流向 (Data Flow)

### 场景 A：新增一个天气 Widget 并请求网络
1. **发现**：Rust 启动时扫描 `widgets/weather/manifest.json`，通过事件告知前端。
2. **加载**：前端进入“编辑模式”，用户拖拽“天气”到网格。
3. **渲染**：前端生成 `<iframe>`，向其注入 `instanceId`。
4. **请求代理**：Weather Widget 内执行 `__widgetBridge.invoke('fetch_url', { url: 'api.weather...' })`。
5. **鉴权转发**：前端将请求转给 Rust。Rust 检查该指令在白名单内，使用 `reqwest` 发起真正的高性能 HTTP 请求。
6. **响应**：Rust 拿到 JSON，返回给前端，前端通过 Message 传回给 iframe，天气 Widget 渲染界面。

### 场景 B：修改 config.toml 热更新
1. **监听**：Rust `notify` 发现文件修改。
2. **解析**：重新读取解析 TOML。
3. **广播**：向前端发送 `config-changed` 事件，附带新 JSON。
4. **重渲染**：前端更新 Context，通过 Bridge 将新的 config 下发给所有存活的 iframe。iframe 内部的视图热重载。

---

## 5. 项目目录结构设计

为了配合这种松耦合架构，代码库建议如下划分：

```text
widget-desktop/
├── src-tauri/               # Rust 后端层
│   ├── Cargo.toml
│   ├── build.rs
│   └── src/
│       ├── main.rs          # 入口
│       ├── display/         # 显示层抽象 (DisplayBackend)
│       │   ├── mod.rs
│       │   └── x11.rs       # X11 具体实现
│       ├── config/          # TOML 与 JSON 解析及文件监听
│       ├── widget/          # Manifest 扫描与注册表
│       └── commands.rs      # IPC 指令入口 (白名单所在处)
├── src-ui/                  # Web 前端层 (React/Vue)
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx          # 主入口
│   │   ├── Grid/            # 拖拽网格引擎
│   │   ├── Editor/          # 组件库抽屉与编辑模式
│   │   ├── IframeHost/      # Iframe 容器与通信代理封装
│   │   └── styles/          # 全局样式（定义 Blur 毛玻璃 Token 等）
└── default-widgets/         # 默认内置组件库 (开发时调试用)
    ├── clock/
    │   ├── manifest.json
    │   └── index.html
    └── system-monitor/
```

---

## 6. 后续演进路线建议

1. **插件市场化**：制定统一的 CLI 工具（如 `widget-cli create`），帮助开发者一键生成标准化包含 `manifest` 和 `index.html` 的脚手架。
2. **性能深度优化**：对于高频更新的 Widget（如 60FPS 的频谱图），未来可研究通过 SharedArrayBuffer 与 Rust 后端直接共享内存，绕过 JSON 序列化开销。
3. **Wayland 无缝切入**：由于 `DisplayBackend` 已抽象，开发 Wayland 支持时，只需在 `display/wayland.rs` 中引入 `gtk-layer-shell-rs` 实现对应 Trait，主干业务零修改。
