# Codex Dream Skin Desktop

常驻 Electron 桌面工具，给 [Codex](https://openai.com/codex/) 桌面客户端实时换肤：本机 CDP 注入，不修改官方安装包，不需要每次重开 Codex 都手动重新操作。

**推荐搭配**：与 [Codex++ Lite（无内置 Dream Skin）](https://github.com/star-power0/CodexPlusPlus-no-dream-skin) 一起使用——Lite 负责启动 Codex、供应商与增强管理，本工具负责主题注入。两者是配套项目，安装包见各自的 GitHub Releases。

非 OpenAI 官方产品。基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)（MIT License）开发，详见下方「与上游项目的关系」和 [NOTICE.md](./NOTICE.md)。

## 它能做什么

- **常驻检测**：轮询 Codex 安装状态与 CDP 调试端口，自动附加到 [Codex++ Lite](https://github.com/star-power0/CodexPlusPlus-no-dream-skin) 启动的 Codex（推荐路径，自带调试端口，直接注入）；手动双击或 CodexBridge 网关启动的 Codex 不带调试端口，应用会自动重启它一次（带调试参数）并注入当前主题，无需手动操作。
- **系统托盘 + 主窗口画廊**：深色沉浸式卡片界面展示所有已保存主题，点击直接切换,当前使用主题有「正在使用」角标。
- **实时切换,不用重启 Codex**：主进程直连 Chrome DevTools Protocol，`Runtime.evaluate` 直接把主题 payload 推给 Codex renderer。
- **可扩展主题库**：主题文件存在 `%LOCALAPPDATA%\CodexDreamSkin\themes\`，跟应用/项目源码完全解耦，装到哪个盘、迁移项目都不受影响。

## 快速开始

```bash
npm install
npm run start
```

首次运行需要让 Codex 以调试参数重启一次（应用会自动处理）。之后：Codex++ 启动的 Codex 自带调试端口，启动本工具即自动注入；手动双击或通过 CodexBridge 网关启动的 Codex 不带调试端口，本工具会检测到并**自动重启一次 Codex（带调试参数）**再注入，全程无需手动操作。

### 与 Codex++ Lite 搭配（推荐）

本工具与 [Codex++ Lite（无内置 Dream Skin）](https://github.com/star-power0/CodexPlusPlus-no-dream-skin) 是配套项目，同属一套使用流程：

1. 安装并启动 Codex++ Lite（从它的 GitHub Releases 下载，不要用官方带内置皮肤版本）；
2. 从 Codex++ Lite 启动 Codex；
3. 启动本工具，自动附加并注入主题。

Codex++ Lite 已完整移除内置 Dream Skin，因此本工具只运行自己的一套主题注入 runtime，不存在两个皮肤 runtime 互相覆盖导致的闪烁；本工具也不会调用或接管任何 Codex++ 清理钩子，不会修改 Codex++ 的设置、安装目录或主题文件。

Codex++ 默认使用 `9229`，但 Windows 端口冲突时会换成临时端口。本应用把 `%USERPROFILE%\.codex-session-delete\latest-status.json` 的 `debug_port` 仅作为候选提示，仍会重新校验本机 CDP 的 `/json/version`、`/json/list`、浏览器 ID、主 renderer target 和 loopback WebSocket 地址后才注入。「等待 Codex++ 启动 Codex」提示只在 Codex++ 启动器真实运行时显示；Codex++ 未运行时（无论磁盘上是否残留状态文件）显示通用的「Codex 未运行」+「启动 Codex」按钮。

> **CodexBridge 是网关，不是启动器**：CodexBridge（第三方）做的是模型路由/API 代理，它启动的 Codex 也是普通进程、不带调试端口，本工具会走上面的自动接管路径。CodexBridge 自带的「重启 Codex」按钮需要它自己配置 ChatGPT.exe 路径（Store 版默认路径它找不到），与本工具无关。本工具内部的 `9335` 端口是它自己接管/重启 Codex 时使用的调试端口，与 CodexBridge 无关。

打包成可分发的安装程序：

```bash
npm run package   # 生成 out/ 下的可执行目录
npm run make       # 生成 Windows 安装程序（MakerSquirrel）
```

### Codex++ 会话页壁纸说明

`1.2.7` 适配 Codex 26.825（渲染进程标题从 Codex 改为 ChatGPT）的自动接管与注入。用量提示横幅、"Try Plus" 按钮和侧栏会话悬停预览卡现在跟随当前主题表面，不再保持宿主白色。壁纸支持按主题缩小：在 `theme.json` 的 `art` 里写 `"zoom": 0.9`（0.5–1，缺省 1），注入器按窗口与主内容区计算 cover×zoom 的精确像素尺寸，并随窗口尺寸变化重算；不写该字段的主题渲染逐位不变，横幅条带与首页 hero 卡不受影响。

`1.2.6` 已适配 Codex++ 1.2.45 的生成式 `MainContentSurface`、`ComposerLayoutRoot` 与 `_ApplicationMenuTopBar_*` 布局。会话页会清理新版 `from-surface` / `via-surface` 底部渐变，壁纸不会在对话框旁边或输入框下方被原生白色横带截断；非宽图主题也会继续铺满壁纸，资源卡、个人菜单、生成式输入框和顶部应用菜单会跟随当前主题表面。新建任务页的 `ComposerLayoutBody` 不再显示宿主白色内层，普通会话文字仍由 Codex 原生字体层级控制，避免人物重影。设置页仍使用主题纯色背景。更新后请完全退出旧版桌面程序，再启动新版解压目录里的 `codex-dream-skin-desktop.exe`，让新的 `vendor/assets/dream-skin.css` 被重新注入。

## 架构简述

```
src/
├── main/
│   ├── main.ts                  入口：托盘、单实例锁、窗口生命周期
│   ├── dream-skin-controller.ts 状态机：检测/启动/停止 Codex 换肤，驱动 InjectionManager
│   ├── injection-manager.ts     主进程直连 CDP：WebSocket 连接 + Runtime.evaluate 注入
│   └── codex-bridge.ts          调用 vendor/scripts/bridge.ps1（Codex 检测、启停）
├── renderer/                    React + TypeScript + Vite，主题画廊 UI
└── shared/theme-store.ts        读写 %LOCALAPPDATA%\CodexDreamSkin\themes\ 与当前主题指针

vendor/                          换肤 runtime、payload 和 Safe CSS 校验器的唯一项目源码

themes/                          随仓库自带的示例主题（三套，见下方说明）
```

**关键设计**：不像上游项目那样启动一个外部子进程做注入，而是主进程直接持有 CDP WebSocket 连接、直接 `Runtime.evaluate`——没有文件系统或子进程当中间层，切换主题是一次内存内的直推。这次架构选择、以及此前踩过的两个坑（打包后 `RunAsNode` fuse 静默失效、`ws` 包在 Vite 打包后崩溃）都完整记录在 [CHANGELOG.md](./CHANGELOG.md)，供后续维护参考。

## 主题怎么创建

**不在这个 App 里做可视化「从图片创建主题」的界面**——这是有意为之，不重复造轮子。创建/修改主题使用本机唯一的 Claude Code Skill：`C:\Users\huang\.claude\skills\dream-skin-theme-designer`。它引用本仓库的 `vendor/` 作为主题格式、payload 与 Safe CSS 校验器的唯一运行时源码；技能本身不再复制进仓库。产出的三件套（`theme.json` + 背景图 + `theme.css`）直接放进 `%LOCALAPPDATA%\CodexDreamSkin\themes\preset-<slug>\`；保存后在 App 主窗口点击「刷新主题库」，新主题就会出现在画廊里，不需要重启或导入。

### 怎么用这个 Skill

在 Claude Code 环境里直接调用本机的 `dream-skin-theme-designer` Skill，然后：

- **创建新主题**：说"帮我设计一个主题"或"给这张壁纸配色"，给出壁纸绝对路径。如果手头没有现成壁纸，也可以说"我还没有壁纸"，Skill 会先看你提供的参考图，套用构图规则（主体一侧、另一侧留低细节空间，方便侧栏/任务页遮罩），生成一版具体的中文生图提示词，拿去外部 AI 绘图工具生成后再回来继续。
- **修改现有主题**：说"帮我改一下 xxx 主题"，Skill 会先枚举当前所有主题给你选，再按你的目标（更亮、换壁纸、提高可读性……）做最小必要的修改，改完给一张改动前后对比表。

流程是：实测壁纸像素 → 看懂壁纸内容（主体、氛围、画风) → 按 `theme.json` 的十个配色维度分角色分配颜色（不是照抄壁纸像素）→ 对比度校验 → 写 Safe CSS 并跑仓库 `vendor/` 校验器 → 落地到主题目录 → 在 App 里实机确认。具体规则、颜色字段与已验证经验都记录在本机权威技能的 `SKILL.md` 和 `CHANGELOG.md` 中。

**这个 Skill 不是一次性写完的规范，是持续迭代总结出来的**——每次设计新主题、改共享运行时代码遇到的问题和解决方式，都会沉淀到本机权威技能中，而不是复制进项目仓库。

## 随仓库自带的主题

`themes/` 下有三套可以直接用的示例主题：

| 主题 | 来源 |
|---|---|
| Cyan Sentinel | 上游项目自带预设 |
| Gothic Void Crusade | 上游项目预设，壁纸由社区贡献者 [@seansong-ideogram](https://github.com/seansong-ideogram) 创作 |
| 小宵虎南·夜祭冷雅 | 本项目原创，用上面的 Skill 设计 |

涉及真实人物写真或游戏角色版权的主题未包含在仓库中。使用方法：把对应的 `preset-*/` 目录复制到 `%LOCALAPPDATA%\CodexDreamSkin\themes\` 下即可。

## 与上游项目的关系

本项目的换肤运行时（`vendor/` 目录）以 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 为基础。其中 Codex 检测/启停脚本、Safe CSS 校验器和安全关键逻辑保持上游兼容；DOM 选择器契约和注入运行时会随 Codex++ 版本适配，当前共享 `dream-skin.css` 已包含 `MainContentSurface` 壁纸连续性修复。Windows Store 包签名校验、CDP 端口归属校验等安全关键逻辑仍沿用原实现。

本项目重新实现的部分是**外壳**：把原项目「安装脚本 + 桌面快捷方式」的交互方式，换成常驻 Electron 应用 + 系统托盘 + 主进程直连 CDP 注入。详见 [NOTICE.md](./NOTICE.md) 的完整归属说明和 [CHANGELOG.md](./CHANGELOG.md) 的每一步演进记录。

## 许可

MIT，见 [LICENSE](./LICENSE)。第三方素材、角色/人物图像的权利归属说明见 [NOTICE.md](./NOTICE.md)。
