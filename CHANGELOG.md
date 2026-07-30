# Changelog

## 上游参考

原项目（`vendor/` 里 `injector.mjs`/`bridge.ps1`/`selectors.json` 等的来源，未做修改直接拷贝）：
<https://github.com/Fei-Away/Codex-Dream-Skin>

本项目工作区曾保留过该项目源码副本（`A:\ClaudeWorkspace\CodexDreamSkin`），已删除；后续如需追新版本改动、对照原始实现，去上面的地址看。

## 未发布 — 2026-07-30（第二轮：主题库刷新 + 连接状态闪烁/误报）

### 新增

- 主窗口头部新增「刷新主题库」按钮：`themes/` 目录下新增/删除主题文件夹后，点击即可重新扫描，不再需要重启整个 App 才能让新主题出现在画廊里。新增 IPC `dream-skin:refresh-themes` 与 `DreamSkinController.refreshThemesNow()`。
- 「连接出错」状态下也补上「重启并启用换肤」按钮——此前只有「Codex 正在运行（未启用换肤）」这一个特定状态才会出现该按钮，检测本身报错时用户完全没有可点的恢复路径。

### 修复：检测超时阈值过紧

- `bridge.ps1` 自身注释写明 `Get-NetTCPConnection` 背后的 CIM 会话在部分机器上冷启动要 15-20 秒，但 `detectCodex()` 硬编码的超时只给了 10 秒，属于必然偶发超时的设计缺陷。提到 20 秒，缓解了一部分误报,但没有解决根因（见下面第三轮）。

### 修复：连接状态"一会儿连上一会儿断开"的闪烁

**根因**：`poll()` 在连接状态为「已连接」时，会连续调用两次 `detectCodex()`——先做一次"复检"，只要这次有一点抖动（PowerShell 冷启动、瞬时超时），就立刻把状态降级为「未运行」并推送给 UI；随后紧接着再跑一次完整检测，如果这次正常又会跳回「已连接」。一个轮询周期内这套"先降级再升级"的逻辑本身就会产生视觉闪烁，不是偶发 bug。

**修复**：`poll()` 每个轮询周期只调用一次 `detectCodex()`，去掉多余的复检分支，状态判定不再自我矛盾。同时给 `poll()` 加了 `polling` 重入锁，防止上一次检测还没返回时下一次 4 秒定时器又叠加一次 PowerShell 冷启动。

### 修复：检测超时误报覆盖真实可用的换肤连接

**根因**：`detectCodex()` 走 `bridge.ps1`，只负责重新校验 Codex 进程的包身份（Windows Store 签名等），跟"换肤实际是否工作"是两条完全独立的通道——真正决定换肤是否生效的是 `InjectionManager` 自己持有的常驻 CDP WebSocket 会话（`injection-manager.ts`）。旧逻辑里检测一超时就无脑把 UI 状态砸成「连接出错」，即使那条真实的注入连接仍然健康、换肤仍然能正常点击生效，用户看到的错误提示与实际行为完全脱节。

**修复**：`InjectionManager` 新增 `isSessionAlive()`，暴露其内部 CDP 会话是否仍然打开且未关闭。`poll()` 捕获到 `detectCodex()` 超时/失败时，先检查当前连接状态是否已经是「已连接」且 `isSessionAlive()` 为真——是则保持原状态不降级，只有注入会话本身也确认失效时才真正显示错误。

**已知限制**：这不是根治，只是不让误报污染 UI。`bridge.ps1 detect` 本身仍会时不时因为 PowerShell 冷启动 CIM 会话而超时——要彻底消除这个超时，需要改用 `bridge.ps1` 自带的 `-Server` 常驻模式（只开一次 PowerShell 进程，冷启动成本只付一次），这个改动更大，需要新建常驻子进程生命周期管理（启动/异常退出重启/请求队列），本轮评估后暂缓。

## 未发布 — 2026-07-30

首个版本：从 `CodexDreamSkin/windows`（PowerShell 脚本 + 三个桌面快捷方式方案）迁移到常驻 Electron 应用，解决旧方案里托盘不稳定、导入路径不直观、每次重开 Codex 都要手动重新注入的问题。

### 新增

- 常驻 Electron 主进程 + 系统托盘，单实例锁防止重复启动；关闭主窗口不退出进程，仅隐藏。
- 自动检测：轮询 Codex 安装状态与 CDP 端口，无需手动点「应用」——检测到 Codex 未运行时自动带调试参数拉起并注入当前主题。
- 深色沉浸式主题画廊界面（React + TypeScript + Vite），大图卡片展示 `%LOCALAPPDATA%\CodexDreamSkin\themes\` 下已保存的全部主题，点击直接切换,当前使用主题有金色光圈与「正在使用」角标。
- `dream-skin-asset://` 自定义 protocol,安全加载本地主题背景图,不经过 `file://` 直读。
- `vendor/scripts/bridge.ps1`：dot-source 原项目 `common-windows.ps1` / `theme-windows.ps1` / `config-utf8.ps1`（未做任何修改）,暴露 `detect` / `start` / `stop` / `status` 四个 JSON-in/JSON-out 命令，供 Electron 主进程调用。所有 Windows Store 包签名校验、CDP 端口归属校验、进程安全性检查均沿用原实现，未重写任何安全关键逻辑。
- `injector.mjs` 及其全部依赖（`image-metadata.mjs`、`theme-package-validator.mjs`、`safe-css-validator.mjs`、`selectors.json`、`renderer-inject.js`、`dream-skin.css`）原样拷贝进 `vendor/`，不修改，保证现有 `dream-skin-theme-designer` skill 输出的主题目录结构完全兼容,无需任何调整。

### 修复

- 修复 `Get-NetTCPConnection` 在本机首次调用耗时约 20 秒的问题（Windows CIM 会话初始化开销，非本项目代码缺陷）。`bridge.ps1` 新增 `Test-PortListening` 快速探测（纯 .NET `TcpClient`，300ms 超时）：仅当端口确认有监听时才继续走慢速的 `Get-DreamSkinVerifiedCdpIdentity` 校验路径,常见的「CDP 未激活」场景耗时从约 20 秒降到约 2 秒。
- 修复检测到 CDP 已激活后从未真正启动换肤注入进程的问题：`DreamSkinController` 在连接成功时只更新了状态,没有调用 `startInjectorWatch`，导致 UI 显示「已连接」但 Codex 实际外观从未改变。补上 `startInjectorWatcherIfNeeded`,连接建立后立即 spawn `injector.mjs --watch` 常驻子进程。
- 修复 watcher 监视目录与 `applyTheme` 实际写入目录不一致的问题：`startInjectorWatcherIfNeeded` 此前传入选中主题在 `themes/preset-*/` 下的原始目录，而 `applyTheme` 复制文件的目标是 `active-theme/`——两者不是同一路径,导致切换主题后 watcher 检测不到变化。统一改为监视 `active-theme/`，`applyTheme` 只需覆盖这个目录的内容,watcher 主循环的 mtime 对比会在一个轮询周期内自动捡起变化,不再需要额外的一次性注入调用。
- 移除因此变得多余的 `applyThemeViaInjector`（一次性 `--verify` 调用）与从未使用的 `cdpStatus`，避免和 watcher 常驻注入并存造成的重复调用。
- 修复打包后换肤注入进程从未真正启动的问题：`startInjectorWatch` 原先通过设置 `ELECTRON_RUN_AS_NODE=1` 环境变量把本 exe 假扮成 Node 解释器来跑 `injector.mjs`，但 `forge.config.ts` 里出于安全考虑设置了 `RunAsNode: false`（Electron 官方 Fuse），会在打包时把这个能力焊死禁用——环境变量在打包后的 app 里完全不起作用。结果是 UI 显示「已连接，实时换肤中」（CDP 握手是真的成功），但注入脚本从未运行，Codex 外观纹丝不动；开发模式（`npm run start`）不受 Fuse 限制，所以调试时一直误判为正常。改用 Electron 官方 `utilityProcess.fork()` API 启动 `injector.mjs`——它直接复用 Electron 二进制自带的 Node 运行时 fork 子进程，不需要 `ELECTRON_RUN_AS_NODE`，因此不受 `RunAsNode: false` 影响，`RunAsNode` 保持关闭不变。

### 架构重构：去掉外部注入子进程，主进程直连 CDP

对比同学 `myzane678/codex-skin-manager` 项目后发现：它把 CDP 客户端、注入运行时、状态机全部实现为主进程内的 TypeScript 代码，没有额外子进程；而本项目为了复用 vendor 的 `injector.mjs`，一直靠「外部子进程 + 文件系统当 IPC」的方式转发主题变更（先是 `spawn` + `ELECTRON_RUN_AS_NODE`，后改 `utilityProcess.fork`），这层进程间协作正是前面两轮 bug（watcher 目录不一致、`RunAsNode` 打包失效）共同的根源。决定收拢架构：

- 新增 `src/main/injection-manager.ts`：主进程内直接用 Electron 打包的 Node 22+ 全局 `WebSocket`（不引入 `ws` 包）连接 CDP loopback WebSocket，动态 `import()` vendor 的 `injector.mjs` 拿到 `loadPayload`，编译出主题 payload 后直接 `Runtime.evaluate` 推给 Codex renderer——不再有独立进程，不再有文件系统中转。
- `dream-skin-controller.ts` 里 `utilityProcess.fork(injector.mjs --watch)` 整段替换为 `InjectionManager`；`applyTheme()` 从「复制文件到 `active-theme/` 等 watcher 轮询发现」变成内存直推，去掉了这一层延迟和潜在的目录不一致风险类别。
- `active-theme/` 目录降级为历史遗留（不再读写），新增轻量指针文件 `active-theme.json` 只用来记住「上次用的是哪个主题」，重启后恢复选择——不再承担进程间通信职责。
- Codex Shell 探测逻辑改为直接读取 vendor 的 `vendor/assets/selectors.json` 契约文件（`shell-main` / `left-panel` / `header-tint` 三个 L1 必需锚点），与 vendor 私有的 `probeSession()` 判定同源，不是重新猜一套选择器。
- `bridge.ps1`（Windows Store 包校验、Codex 进程启停）与 vendor 的 `loadPayload`/`loadTheme`/主题 schema 完全不变——这次重构只动了「如何把 payload 送进 Codex」这一层，皮肤目录结构和 `dream-skin-theme-designer` skill 的输出格式不受影响。

**踩坑记录**：中途一度引入 `ws` npm 包手写 CDP 客户端，打包后主进程抛 `TypeError: r.mask is not a function`——`ws` 内部靠条件 `require('bufferutil')` 检测原生加速模块，被 Vite bundle 后这段动态 require 被破坏；即便用 `external` 让 Vite 不打包它，Electron Forge 打包本身也不会把 `node_modules/ws` 带进产物（`app.asar` 只包含 Vite 编译产物，不包含依赖）。最终方案是完全不用 `ws`，改用 vendor 的 `injector.mjs` 本来就在用的 Electron 内置全局 `WebSocket`——零外部依赖，也是本该复用而不是重新发明的地方。

### 新增：应用图标

之前托盘图标、exe 图标全部是空的/Electron 默认图标，App 内品牌标志是纯 CSS 画的一个「梦」字（生硬、不够美观）。补齐一整套图标资源：

- `assets/icon.ico`（16/24/32/48/64/128/256 多分辨率，用 `sharp` + `png-to-ico` 从一张 2048×2048 源图批量生成）接入 `forge.config.ts` 的 `packagerConfig.icon`（exe/任务栏图标）与 `MakerSquirrel.setupIcon`（安装程序图标）。
- `assets/tray-icon.png` / `tray-icon@2x.png`（16px / 32px，供高 DPI 显示器）接入系统托盘。
- `assets/app-icon.png`（512px）替换掉 `App.tsx` 里 `<span>梦</span>` 的临时占位符，改为真实 `<img>`。
- 新增 `src/renderer/assets.d.ts` 声明 `*.png` 模块类型，让 renderer 侧 `import appIcon from '../../assets/app-icon.png'` 能过 TypeScript 类型检查。

**踩坑记录**：托盘图标补上文件后打包仍是空白。根因是 `main.ts` 里 `createTray()` 用 `path.join(__dirname, '..', '..', 'assets', 'tray-icon.png')` 拼路径——这条路径规则只在开发模式下成立（`__dirname` 指向源码目录），但 Forge 打包产物里从未把项目根目录的 `assets/` 复制进去，`fs.existsSync` 检测不到文件就静默 fallback 成空图标，没有任何报错提示。修法是把 `assets` 加进 `packagerConfig.extraResource`（与 `vendor` 同样的机制），并按 `app.isPackaged` 分支切换到 `process.resourcesPath/assets` 路径，跟 `codex-bridge.ts` 里 `vendorPath()` 的判断逻辑保持一致。

### 开源发布

首次公开发布，新增 `LICENSE`（MIT）、`NOTICE.md`（第三方归属与素材权利说明）、`README.md`（架构、使用方法、与上游关系）。

- `themes/`：随仓库带三套主题作为示例——两套上游预设（Cyan Sentinel、Gothic Void Crusade，后者壁纸由社区贡献者 @seansong-ideogram 创作贡献给上游）+ 一套本项目原创（小宵虎南·夜祭冷雅，用下面的 skill 设计）。真人写真、游戏角色等有肖像/版权风险的主题不进仓库。
- `skills/dream-skin-theme-designer/`：把创建/修改主题用的 Claude Code Skill 一并开源，README 里说明了具体用法和「持续迭代总结、不是一次性规范」的性质。

### 已知限制

- 首次连接建立仍需要 Codex 本身以调试参数重启一次；这是 CDP 注入的物理限制，与实现无关，Windows 版和 macOS 版一致存在。
- 「从图片创建主题」的可视化界面尚未实现,新建/修改主题仍通过 `dream-skin-theme-designer` skill 完成——这是有意为之，不重复造轮子。
