# Widget Desktop — 需求文档

> 状态：草稿 v0.3  
> 最后更新：2026-06-02  
> 技术栈：Tauri 2.x（Rust 后端 + Web 前端）

---

## 1. 背景与动机

传统桌面（壁纸 + 图标网格 + 文件存放）的交互范式自 1981 年 Xerox Star 以来几乎没有本质变化。在实际使用中，桌面大多数时候被窗口遮住，图标的使用频率也很低，整体利用率不高。

受 [iTab](https://www.itab.link/) 那种"卡片式 / 小组件式"浏览器新标签页布局启发，本项目希望把桌面变成一个真正有用的**个人仪表盘**——让桌面层显示有意义的信息和快捷操作，而不只是一张壁纸加一堆文件图标。

---

## 2. 产品定位

### 2.1 核心目标

- 做一个基于 **Tauri** 的桌面层应用，挂在所有窗口之下（壁纸位置）
- 承载可组合的小组件（Widget），把桌面变成个人信息仪表盘
- **替换掉本机上现有发行版自带的 desktop 进程**（如 deepin 的 `dde-desktop`、XFCE 的 `xfdesktop`），自己用起来
- 优先满足个人使用，提供 Debian `.deb` 包方便安装
- **显示环境：先支持 X11，后续迭代支持 Wayland**，代码层面做好抽象隔离

### 2.2 设计哲学

- **极致的视觉体验**：界面与组件设计必须以美观、现代、易用为核心重点。充分利用毛玻璃（Blur）、平滑动画等高级视觉特效，打造极具质感的桌面。
- **先用起来，再考虑兼容**：不因为担心未来的扩展而过度设计，但要留好扩展点
- **Widget 是一等公民**：每个 widget 是独立单元，配置驱动，互不耦合
- **轻量常驻**：作为常驻进程，内存和 CPU 占用要尽可能低
- **个人项目起步**：功能够自己用就行，代码质量对自己负责

---

## 3. 非目标（Out of Scope）

以下内容在当前阶段**明确不做**，避免范围蔓延：

| 不做的内容 | 原因 |
|---|---|
| 桌面文件图标显示与管理 | 工程量大，当前不需要 |
| 右键菜单、桌面文件拖拽、回收站 | 同上 |
| 完整 XDG 规范遵循 | 遇到具体痛点再加 |
| 多发行版兼容 | 只针对自己机器 |
| 跨平台支持（Windows/macOS） | 仅 Linux |
| rpm/flatpak 打包 | 当前只做 deb，其余格式后续再说 |
| Wayland 支持 | **第一阶段只做 X11**，Wayland 列入后续迭代 |
| 多用户场景 | 不适用 |
| 商业化、组件市场 | 后续再说 |

以下内容**后续可能加，现在预留扩展点**：

- **Wayland 支持**（wlr-layer-shell 协议，下一个大版本目标）
- Widget SDK / 第三方 widget 插件机制
- 情境（Context）切换 —— 多套桌面配置（工作/娱乐/学习）
- AI 集成（自然语言搜索、智能重排 widget）
- 桌面图标（作为一类特殊 widget）

---

## 4. 显示环境支持策略

应用内部通过一个抽象层（`DisplayBackend` trait）隔离 X11 和 Wayland 的差异，上层业务代码不感知底层协议。

```
┌─────────────────────────────────────┐
│        业务层（Widget / 壁纸 / 布局）  │
├─────────────────────────────────────┤
│       DisplayBackend trait（抽象）    │
├──────────────────┬──────────────────┤
│  X11Backend      │  WaylandBackend   │
│  （第一阶段实现） │  （后续迭代实现）  │
└──────────────────┴──────────────────┘
```

### 第一阶段：X11

桌面层窗口通过以下方式实现：

- 设置 `_NET_WM_WINDOW_TYPE_DESKTOP` hint，让 WM 把窗口固定在桌面层
- 设置 `_NET_WM_STATE_SKIP_TASKBAR` 和 `_NET_WM_STATE_SKIP_PAGER`，不出现在任务栏
- 窗口不设置 `InputOnly`，保留鼠标点击交互，但通过焦点策略避免抢夺键盘焦点
- 多显示器通过 Xinerama / XRandR 获取屏幕拓扑

### 第二阶段（后续）：Wayland

- 使用 `wlr-layer-shell` 协议，挂到 `BACKGROUND` 层
- 支持 KDE Plasma（KWin）、Hyprland、Sway 等 wlroots 系合成器
- GNOME Mutter 因不支持 wlr-layer-shell，暂不在支持范围内

---

## 5. 功能需求

### 5.1 桌面层窗口

**F1**：应用启动后，在所有显示器上创建全屏窗口，铺满整个屏幕。

**F2**：窗口必须置于所有普通应用窗口**之下**，始终保持在桌面层：
- **X11（当前）**：设置 `_NET_WM_WINDOW_TYPE_DESKTOP` hint
- **Wayland（后续）**：使用 `wlr-layer-shell` 协议，将窗口挂到 `BACKGROUND` 层

**F3**：桌面层窗口**不抢夺键盘焦点**。打开其它应用时焦点应落到该应用，而不是桌面层。当所有窗口最小化或桌面可见时，桌面层可以接受鼠标点击。

**F4**：多显示器时，每个显示器各有一个独立的全屏桌面层窗口，显示内容按以下默认策略处理：
- **主屏**：显示完整的 widget 仪表盘（组件 + 壁纸）
- **副屏**：仅显示壁纸，不显示 widget

此行为可在 `config.toml` 中按屏幕单独配置（副屏也可开启 widget 显示）。

**F5**：当连接/断开显示器时（XRandR 热插拔事件），应用自动适应新的显示器拓扑：
- 新接入的显示器按默认策略（仅壁纸）处理
- 主屏拔出时，layout 状态保留，等待主屏重新接入后恢复

### 5.2 替换原 desktop 进程

**F6**：提供一个 shell 脚本 `install.sh`，用于：
1. 检测当前 DE（deepin / XFCE / MATE 等），停止并禁用对应的原 desktop 进程
2. 安装 systemd user service 并启动本应用

**F7**：通过 **systemd user service** 实现开机自启：

```ini
[Unit]
Description=Widget Desktop
After=graphical-session.target

[Service]
ExecStart=/usr/bin/widget-desktop
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=default.target
```

**F8**：若检测到原 desktop 进程（如 `dde-desktop`）仍在运行，写入日志警告，不强制 kill，避免影响系统稳定性。

### 5.3 壁纸管理

**F9**：应用自身负责壁纸的渲染，不依赖 compositor 或 DE 的壁纸设置。好处是主屏/副屏可以配置不同壁纸来源。

**F10**：支持以下壁纸来源（在 `config.toml` 中配置）：

| 来源类型 | 说明 |
|---|---|
| 本地图片 | 指定本地图片路径，支持 jpg / png / webp |
| 纯色 | 指定 HEX 颜色值 |
| Bing 每日壁纸 | 自动从 Bing 每日壁纸 API 拉取，每天更新 |
| 本地目录轮换 | 指定本地目录，按设定的时间间隔随机轮换 |

**F11**：Bing 每日壁纸通过以下公开 API 获取（无需 API Key）：
```
https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN
```
- 应用启动时检查并下载，缓存到 `$XDG_CACHE_HOME/widget-desktop/wallpaper/`
- 若网络不可用，使用上次缓存的壁纸；若从未缓存，显示纯色降级背景
- 每天最多检查一次，不重复下载

**F12**：壁纸填充方式可配置：`fill`（裁剪填满）、`fit`（保持比例留黑边）、`stretch`（拉伸）、`center`（居中不缩放）。

**F13**：主屏和副屏可以配置**不同的壁纸来源**，互相独立。

### 5.4 Widget 系统

**F14**：Widget 是独立单元。每个 widget：
- 位于独立目录（`$XDG_CONFIG_HOME/widget-desktop/widgets/<widget-id>/`）
- 包含一个 `manifest.json`，描述元数据
- 由宿主程序动态发现和加载，不硬编码进主程序

**manifest.json 示例**：
```json
{
  "id": "clock",
  "name": "时钟",
  "version": "1.0.0",
  "entry": "index.html",
  "sizes": ["1x1", "2x1", "2x2"],
  "defaultSize": "2x1"
}
```

**F15**：Widget 支持以下尺寸规格（参考 iTab 大/中/小概念）：
- 小（1×1 格子）
- 中（2×1 格子）
- 大（2×2 格子）
- 格子的像素大小由全局 `grid.cell_size` 配置决定

**F16**：Widget 之间物理隔离且不直接耦合。宿主程序在 WebView 网格中动态生成 `<iframe>` 承载各 Widget，并通过约定的 JavaScript 接口进行安全双向通信：
```js
// 宿主向 iframe 注入的全局通信对象
window.__widgetBridge = {
  config: { /* widget 自定义参数 */ },
  on: (event, callback) => { /* 订阅系统推送的事件或高频数据 */ },
  invoke: async (command, args) => { /* 只能调用后端白名单内的受限指令（如受限网络请求） */ }
}
```

**F17**：首批内置示例 Widget（优先实现，用于验证架构跑通）：
- **时钟与日历**：显示当前时间与日期，验证基础渲染与时间定时更新机制。
- **系统状态监控**：显示 CPU/内存/网络信息，验证 Rust 后端采集数据并通过 `window.__widgetBridge` 高频推送给前端的机制。
- **AI API 额度监控**：填入 API Key，监控常用大模型平台的余额，验证后端网络请求代理与敏感配置（密钥）管理机制。

**附：后续规划的常用及特色 Widget 列表**
除上述验证组件外，系统规划逐步引入以下组件，丰富桌面生态：
- **常用效率与信息类**：
  - **倒数日 / 纪念日** (1x1, 2x1)：大数字展示倒计时（如发工资、节假日等）。
  - **番茄钟 / 专注计时** (1x1, 2x1)：极简倒计时表盘，结束可调用系统 `notify-send` 发送桌面通知。
  - **习惯打卡网格** (2x1, 2x2)：类似 GitHub 绿点图，每日点击记录日常习惯状态。
  - **待办 / 灵感便签** (2x2)：极简文本框，失焦自动保存本地，用于随手记录。
  - **快捷指令 / 书签** (1x1, 2x2)：常用网站或本地应用的入口，点击唤起系统浏览器或本地终端/程序。
  - **GitHub 动态监控** (2x2)：监控指定仓库（Star/Issue/PR 状态）或个人贡献绿点图。
  - **天气预报** (2x1, 2x2)：当前气温、图标与未来几日的趋势预测。
- **AI 时代特色类**：
  - **AI 资讯精选看板** (2x2)：滚动展示最新的精选 AI 资讯（例如抓取 `aihot.virxact.com`）。由 Rust 后端定时抓取以解决跨域 (CORS) 和基础反爬问题。
  - **每日提示词 (Prompt)** (2x1)：每天随机展示高质量的 AI Prompt 技巧或工具推荐，支持一键复制到剪贴板。

### 5.5 配置文件

**F18**：应用配置存放在 XDG 标准路径：
```
$XDG_CONFIG_HOME/widget-desktop/config.toml
# 通常是 ~/.config/widget-desktop/config.toml
```

**F19**：`config.toml` 结构示例：
```toml
[grid]
columns = 24
rows = 14
cell_size = 80   # px
gap = 12         # px

[display.primary]
wallpaper_source = "bing"
wallpaper_fit = "fill"
widgets_enabled = true

[display.secondary]
wallpaper_source = "color:#1a1a2e"
widgets_enabled = false

# 注意：config.toml 只保存启用的实例及业务配置。位置和尺寸作为布局事实存放在 layout.json 中
[[widgets]]
id = "clock"
instance_id = "clock_1"
[widgets.config]
format = "24h"

[[widgets]]
id = "todo"
instance_id = "todo_1"
[widgets.config]
file = "~/.local/share/widget-desktop/todo.json"
```

**F20**：配置文件支持**热加载**——修改 `config.toml` 后，应用在不重启的情况下重新加载布局和 widget 参数（inotify 监听实现）。

**F21**：Widget 的渲染位置与尺寸数据独立存储，作为布局的唯一事实来源，不写入 `config.toml`：
```
$XDG_DATA_HOME/widget-desktop/layout.json
```

**F22**：首次启动若 `config.toml` 不存在，自动生成含默认值的配置文件。

### 5.6 用户交互

**F23**：普通模式下，点击 widget 触发该 widget 的默认操作（如待办 widget 展开编辑框，时钟 widget 无响应）。

**F24**：支持"编辑模式"，通过快捷键（默认 `Super+E`，可在 config.toml 中修改）进入：
- 屏幕侧边弹出**“组件库抽屉”**，用户可从中将新 Widget 拖拽到桌面上。
- 已在桌面的 widget 显示拖拽边框和手柄，可以拖动调整位置（吸附到网格）。
- 可以调整 widget 尺寸（拖拽边角，按格子单位缩放）。
- 退出编辑模式后自动保存布局到 `layout.json`。

**F25**：桌面空白区域**不响应右键菜单**（当前版本明确不做）。

### 5.7 应用生命周期

**F26**：应用崩溃重启后，从 `layout.json` 恢复上次的布局状态。

**F27**：提供干净的退出路径（`systemctl --user stop widget-desktop`），退出前保存当前布局。

**F28**：应用日志写入：
```
$XDG_CACHE_HOME/widget-desktop/widget-desktop.log
```
支持按大小轮转（单文件上限 10MB，最多保留 3 个历史文件）。

### 5.8 打包与安装

**F29**：通过 Tauri 官方 bundler 构建 Debian `.deb` 安装包，包含：
- 主程序二进制（`/usr/bin/widget-desktop`）
- systemd user service 文件（`/usr/lib/systemd/user/widget-desktop.service`）
- 默认 widget 资源（`/usr/share/widget-desktop/widgets/`）
- 桌面入口文件（`/usr/share/applications/widget-desktop.desktop`）

**F30**：`.deb` 包声明必要的运行时依赖：`libwebkit2gtk-4.1`、`libgtk-3-0`、`libayatana-appindicator3-1`（如需托盘）。

---

## 6. 非功能需求

### 6.1 性能

- 空闲时 CPU 占用 **< 1%**
- 常驻内存 **< 150MB**（含 WebView 开销）
- 首次渲染（登录到看到桌面）**< 2 秒**
- Widget 动画帧率 **≥ 60fps**

### 6.2 稳定性

- 单个 widget 出错（JS 异常），**不影响其它 widget 和主程序**
- 主程序崩溃后由 systemd 在 5 秒内自动重启

### 6.3 可扩展性

- 新增一个 widget 只需在 widgets 目录新建文件夹 + manifest.json，不修改主程序代码
- 配置文件格式变更时需向后兼容（旧配置能被迁移或使用默认值）
- `DisplayBackend` 抽象层设计需支持后续添加 Wayland 实现，不破坏现有 X11 代码

---

## 7. 技术选型

| 组件 | 选型 | 理由 |
|---|---|---|
| 应用框架 | Tauri 2.x | 内存远低于 Electron，安装包小，Rust 后端可直接调用系统 API |
| 前端框架 | React 或 Vue（待定） | 组件化天然适合 widget 系统，npm 生态丰富 |
| 桌面层挂载（X11） | `x11rb` crate | 纯 Rust X11 绑定，设置 `_NET_WM_WINDOW_TYPE_DESKTOP` hint |
| 桌面层挂载（Wayland，后续） | `gtk-layer-shell-rs` crate | wlr-layer-shell 协议的 Rust 封装 |
| 多显示器信息（X11） | `xrandr` crate 或调用 `xrandr` 命令 | 获取屏幕拓扑，监听热插拔事件 |
| 配置格式 | TOML | 人类可读、支持注释，`serde + toml` 原生支持 |
| 文件监听 | `notify` Rust crate | inotify 封装，用于配置热加载 |
| 自启动机制 | systemd user service | 现代 Linux 标准方案，支持崩溃重启 |
| 打包 | Tauri bundler（deb target） | 官方支持，开箱即用 |
| HTTP 请求（壁纸下载） | `reqwest` crate | 异步 HTTP，支持代理 |

---

## 8. 概念术语表

| 术语 | 定义 |
|---|---|
| **桌面层** | 全屏窗口，挂在所有普通窗口之下，替代系统原有 desktop 进程的视觉区域 |
| **Widget** | 桌面层上的独立信息/功能单元，如时钟、待办、天气等 |
| **网格（Grid）** | 桌面的布局系统，widget 按格子单位定位和缩放 |
| **Manifest** | widget 目录下的 `manifest.json`，描述 widget 的 id、名称、支持的尺寸等 |
| **编辑模式** | 允许用户拖拽调整 widget 位置和尺寸的交互状态 |
| **普通模式** | 正常使用状态，widget 响应点击交互 |
| **layout.json** | 保存 widget 在网格中位置/尺寸信息的运行时数据文件 |
| **config.toml** | 用户主配置文件，包含全局参数和已启用的 widget 声明 |
| **DisplayBackend** | 内部抽象层，隔离 X11 和 Wayland 的差异，上层代码不感知协议 |

---

## 9. MVP 里程碑

以下全部完成即为第一个可用版本（全部基于 X11）：

- [ ] Tauri 应用启动，在 X11 环境下通过 `_NET_WM_WINDOW_TYPE_DESKTOP` 挂到桌面层
- [ ] 主屏全屏显示，支持 Bing 每日壁纸和本地图片壁纸
- [ ] 副屏全屏显示壁纸，不显示 widget
- [ ] 加载并显示内置时钟 widget
- [ ] 加载并显示内置待办 widget
- [ ] 读取 `config.toml`，根据配置决定 widget 位置和参数
- [ ] 配置文件热加载（修改 config.toml 后实时生效）
- [ ] 编辑模式：拖拽 widget 调整位置，退出后保存
- [ ] 通过 systemd user service 开机自启，崩溃自动重启
- [ ] 打出可安装的 `.deb` 包

---

## 10. 待决策与已决事项

| 问题 | 选项 | 当前决策/倾向 |
|---|---|---|
| 前端框架 | React vs Vue | 未定，按个人熟悉度选 |
| Widget 渲染隔离方式 | 同一 WebView 组件隔离 vs 独立 iframe | **已决：使用动态 iframe 隔离**，确保第三方组件的沙盒安全与完美热插拔。 |
| 壁纸渲染方式 | CSS background-image vs Canvas 绘制 | **已决：CSS background-image**，简单直接 |
| 视觉特效支持 | 纯色/半透明 vs 实时毛玻璃 (blur) | **已决：全面支持实时的毛玻璃 (backdrop-filter) 特效**。因为 KWin 等目标混成器环境支持良好，且 UI 质感与美观度是本项目的核心重点。 |
| 编辑模式触发方式 | 快捷键 vs 右键菜单 vs 托盘菜单 | 快捷键优先，托盘菜单后续补 |
| X11 焦点策略细节 | `FocusProxy` 窗口 vs 直接不设焦点 | 待实现时验证哪种方案更干净 |
