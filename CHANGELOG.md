# Changelog

## 1.2.6 — 2026-08-17（新建任务输入框与顶部菜单栏修复）

### 修复

- 兼容 Codex++ 1.2.45 生成的 `_ApplicationMenuTopBar_*` 顶栏类名，恢复顶层应用菜单的主题半透明底、分隔线和模糊效果，避免壁纸完全透出。
- 修复新建任务首页 `ComposerLayoutBody` 内层仍沿用宿主白色 surface 的问题；仅在首页将该内层清为透明，显示已经主题化的 `ComposerLayoutRoot` 外壳，不改变普通会话页。

### 测试

- `npm test`：12 个测试通过，包含生成式应用菜单栏和新建任务 composer 回归断言。
- `npm run lint`：通过。
- 实机 CDP 检查普通会话与新建任务两态，确认普通会话 composer 保持主题表面。

## 1.2.5 — 2026-08-16（Codex++ 卡片与生成式输入框修复）

### 修复

- 修复 Codex++ 1.2.45 的资源卡、代码块和个人菜单仍沿用宿主白灰 surface 的问题：新版 surface token 仅在会话和覆盖层作用域内映射到当前主题，避免污染其他路由。
- 将生成式 `ComposerLayoutRoot` 与 `ComposerLayoutFooter` 纳入选择器契约和 `data-ds-part` 标注，现有主题的 composer 背景、阴影、圆角和工具栏颜色重新生效。
- 移除共享 CSS 对 `body` 的字体强制覆盖，普通会话、卡片和弹窗重新遵循 Codex 原生字体层级；代码内容继续使用原生等宽字体。
- 保持 1.2.4 的单层壁纸、非宽图壁纸兜底和 `from-surface` / `via-surface` 底部渐变清理。

### 测试

- `npm test`：11 个测试通过，包含生成式 composer 选择器和作用域 token 回归断言。
- `npm run lint`：通过。
- 三套内置主题的 Safe CSS 与 payload 校验通过。
- 实机注入验证桥本有菜、小宵虎南和 Gothic Void Crusade：composer、资源卡、个人菜单均使用主题表面；底部白带不复现。

## 1.2.4 — 2026-08-16（主题壁纸与浅色蒙层回归修复）

### 修复

- 修复部分非宽图主题在 Codex++ 线程页没有壁纸的问题：任务模式不再依赖 `data-dream-art-wide` 才铺设文档壁纸。
- 恢复桥本有菜等浅色主题原本的轻量可读性蒙层，仅清理 Codex 原生 `from-surface` / `via-surface` 底部渐变，避免白带和整张壁纸发白混在一起。
- 保留新版 `MainContentSurface`、`MainContentViewport`、`MainContentFrame` 的透明连续性处理，并恢复项目原有的 Codex 字体基线，避免对话框字体被共享 CSS 改变。

### 测试

- `npm test`：10 个测试通过。
- `npm run lint`：通过。
- 三套内置主题 payload 与 Safe CSS 校验通过。
- 实机检查：桥本有菜和非宽图主题均有连续壁纸且人物不重影；深色主题注入 `pass: true`。

## 1.2.3 — 2026-08-16（Codex++ 会话底部渐变修复）

### 修复

- 修复 Codex++ 1.2.45 会话页输入框下方仍出现白色横带的问题。根因是新版底部元素使用 `bg-gradient-to-t from-surface via-surface`，旧规则只匹配 `from-token-main-surface-primary`。
- 清理新版 `from-surface` / `via-surface` 底部渐变，同时保持桥本有菜壁纸只绘制一层，修复人物重影回归。
- 实机注入当前 `preset-arina-hashimoto` 主题验证：白带消失，人物不再重影。

### 测试

- `npm test`：10 个测试通过。
- `npm run lint`：通过。
- 当前 Codex 9335 renderer 注入检查：`pass: true`，`documentPass: true`，`structurePass: true`。
- Windows x64 可执行目录已生成到 `out-1.2.3/codex-dream-skin-desktop-win32-x64/`，产物内运行时 CSS 与源码 SHA-256 一致。

## 1.2.2 — 2026-08-16（Codex++ 壁纸连续性修复）

### 修复

- 修复 Codex++ 1.2.45 会话页中对话框旁边和输入框下方出现白色原生 surface、壁纸显示不完整的问题。
- 将新版 `MainContentSurface`、外层 `main/webview` 宿主、`MainContentViewport` 和 `MainContentFrame` 纳入壁纸连续性处理；设置页仍保持纯色背景。
- 清除新版线程底部原生渐变，并降低任务遮罩的最终不透明度，避免在壁纸底部形成整条黑/白色横带；不改变浮动顶栏定位和 46px 内容预留。

### 测试

- `npm test`：10 个测试通过，包含新增的共享 CSS 回归断言。
- `npm run lint`：通过。
- 三套内置主题的 `injector.mjs --check-payload` 与 `validate-safe-css-file.mjs`：全部通过。
- Windows x64 可执行目录已重新生成到 `out-1.2.2/codex-dream-skin-desktop-win32-x64/`；旧 `out/` 目录因 Windows 文件占用未覆盖，避免强制删除正在使用的产物。

## 未发布 — 2026-08-11（主题设计技能收敛与契约对齐）

### 修复

- 将权威 `dream-skin-theme-designer` 技能与桌面 App 本地加载器、Safe CSS 白名单和 Codex++ 1.2.45 选择器契约重新对齐：明确区分本地主题、完整设计基线和分发包规则；本地新主题保存后须点击「刷新主题库」才会出现，不再错误宣称目录会自动监听。
- 技能验证流程新增 `injector.mjs --check-payload`；对比度检查现在将正文、次要文字及已声明的 `accent`/`highlight` 交互色全部作为阻断门槛。无 `colors` 的历史兼容主题明确标为 skipped，不能伪装为新主题通过。
- 修复 Gothic Void Crusade 实际主题文件与技能历史记录不一致：背景改为 `#0c0b08`、secondary 改为 `#8c6b3a`、highlight 改为 `#b03c33`，highlight 对 panel 的对比度从 `2.18:1` 提升到 `3.07:1`。
- 在 Codex++ 1.2.45 的同一首页路由逐套实拍本地主题后，只微调了实际存在表面断层的桥本有菜、Exusiai 明亮横幅与三上悠亚。桥本有菜补显式浅色完整配色并移除写死冷粉 header；Exusiai 把暖米灰 `background`/`panel`/`sidebar` 微调为贴合壁纸雾蓝白安全区的冷白蓝；三上悠亚将均匀浅黄米色表面收敛至右侧木质奶咖色温，并移除写死表面背景。三套均保留原壁纸、构图和交互色体系；其余主题未改。

### 说明

- 删除仓库内重复的技能副本，只保留 `C:\Users\huang\.claude\skills\dream-skin-theme-designer` 作为权威技能。该技能引用本仓库 `vendor/` 作为主题格式、payload、Safe CSS 校验器与共享 runtime 的唯一源码，不再需要双向同步。

## 1.2.1 — 2026-08-11（手动启动 Codex 自动接管换肤）

### 新增

- 手动启动的 Codex（双击官方客户端、CodexBridge 网关等）不会携带 CDP 调试端口（该端口只能在进程启动时传入），此前皮肤项目只能显示「Codex 正在运行（未启用换肤）」并等待用户手动点击「重启并启用换肤」。现在检测到运行中但无调试端口的 Codex 时，会在 10 秒稳定期后**自动重启一次 Codex（带调试端口）并注入当前主题**，与 Codex++ 路径一样全自动。每次应用启动只自动接管一次，避免重启失败时无限循环；用户手动点「重启并启用换肤」后会重新武装自动接管。
- Codex++ 启动的 Codex 自带调试端口，走正常的 discovery 路径，不会触发自动重启，行为不变。

### 修复

- 「等待 Codex++ 启动 Codex」提示现在只在 Codex++ 启动器**真实运行**时显示；此前只要磁盘上残留 `latest-status.json`（Codex++ 未运行时也存在）就显示该提示，会误导主要使用 CodexBridge 的用户。Codex++ 未运行时改显示通用的「Codex 未运行」+「启动 Codex」按钮。

### 说明

- CodexBridge（第三方网关）自身「重启 Codex」按钮失败是其配置问题（需在 CodexBridge 中配置 ChatGPT.exe 路径，Store 版默认路径它找不到），与皮肤项目无关。
- 桌面快捷方式图标空白为 Windows 图标缓存陈旧所致，删除 `%LOCALAPPDATA%\Microsoft\Windows\Explorer\iconcache_*.db` 并重启 Explorer 即恢复；exe 图标资源本身完整。
- 任务栏/开始菜单显示 Electron 默认图标通常是因为运行的是 `npm start` 开发实例（进程名 `electron.exe`，使用 Electron 自带图标）；使用打包后的 `codex-dream-skin-desktop.exe`（进程名为应用名）即显示品牌图标。

## 1.2.0 — 2026-08-11（Codex++ 1.2.45 适配与顶栏几何回归修复）

### 修复

- 修复会话页标题错位：Codex++ 1.2.45 把顶栏的 `.app-header-tint` 改成 CSS Modules 生成类，皮肤中 `> :not(header.app-header-tint)` 的排除因此静默失效，规则的 `position: relative` 覆盖了顶栏原生的 `position: fixed`，顶栏落回文档流。CDP 实测偏移：`x 284 → 568`（正好一个侧栏宽度）、`y 36 → 72`、`z-index 30 → 1`、内容顶 `y 83 → 129`（顶栏占掉 46px 流高）。三处规则改为按元素类型排除 `:not(header)`，主表面唯一的直接子 `header` 就是原生顶栏，故该写法既充分又不受后续改名影响。A/B 实测皮肤开/关两态几何一致：header `{x:284, y:36, w:1241, h:46}` fixed z30。
- 修复选择器契约 `header-tint` 仍钉死已被移除的 `header.app-header-tint`（实测命中 0）导致的连带故障：该 L1 缺失会让 `renderer-inject.js` 把整条路由降级为 L0，而 L0 下注入器要求首页或设置页锚点可见——会话页永远无法满足，`structurePass` 在会话页恒为 false。锚点改为「旧类名或主表面直接子 header」二选一，并同步 `renderer-inject.js` 中手工维护的内联副本。实测会话路由现报 `baseState: thread`、`level: L1`、`missingL1: []`、`structurePass: true`。
- 修复 Codex++ 1.2.45 无 `[role="main"]` 的会话路由：外层壁纸已显示但原生内容 frame 仍保留黑/白不透明背景，导致对话区域出现矩形遮罩、壁纸看起来被截断。
- 将 `MainContentSurface` 兜底壁纸限定在新版生成的主表面，并只清理会话滚动容器和内容 frame；消息卡片、composer、dialog 等主题表面保持不变。
- 让新版生成主表面沿用任务页的 `ambient/full` 遮罩，而不是误用首页沉浸渐变，避免浅色主题出现白带、深色主题出现黑带。
- 清理新版主表面下 Codex++ 原生线程底部渐变，避免输入框外围出现随预设 `--ds-bg` 变化的黑/白/彩色条带。
- 修复设置路由仍显示新版主表面壁纸伪元素，导致设置内容上方露出一条壁纸并产生内容下移错觉；使用设置搜索框作为 Codex++ 1.2.45 的稳定路由锚点，设置页恢复为主题背景表面，并移除设置内容 frame 重复的 46px toolbar 偏移。
- 修复缓存的隐藏 webview 导致首页被误判成设置页、壁纸消失的回归；路由切换时同步刷新设置锚点状态。
- 修复新建任务页与对话页正文区顶部出现一条横向分界线：Codex++ 1.2.45 把顶部 chrome fade 改名为 CSS Modules 类（`_MainContentTopFade_`），旧规则只匹配 `.app-shell-main-content-top-fade` 因而失效，该层用原生 main-surface token 盖在壁纸上形成硬边。现只清除其绘制（`background`/`opacity`），不改动任何布局偏移——此前一并清零 `--app-shell-main-content-frame-top-offset` 与 `margin-top` 会使正文上移 46px 并与顶栏文字重叠，已确认该偏移是浮动顶栏的必要预留。
- 适配 Codex++ 新版大小写变化的 `_ComposerHomeUtilityBar_` 类名，让新建对话页的工作区选择栏不再保留原生白色 surface。
- 同步扩展顶部 fade 清理范围，并更新选择器契约以识别 Codex++ 的 `MainContentSurface` 主表面，保证常驻注入器能继续完成跨主题刷新。
- 未调整任何预设的颜色、`ambient/full` 任务模式或壁纸文件。

### 说明

- 右侧「输出」面板的折叠按钮经核查不是缺陷：其折叠箭头由原生 Tailwind `opacity-0 group-hover/section-toggle:opacity-100` 控制，设置其 `opacity` 的规则全部来自原生样式表，无皮肤规则参与。用真实鼠标事件悬停实测 `opacity` `0 → 1`、移出回 `0`，命中测试通过，属设计上的悬停显示。

### 验证

- `npm test`：7 个测试通过。
- `npm run lint`：通过。
- 三套主题（abyssal-cyan-reverie / xiaoxiao-hunan-night-festival / 三上悠亚）`injector.mjs --check-payload` 与 `validate-safe-css-file.mjs` 全部 validated。
- `npm run package`：Windows x64 打包通过，产物内已确认包含 `:not(header)` 修复、top-fade 清理与新 `header-tint` 契约。

## 1.1.0 — 2026-08-10（Codex++ no-dream-skin 支持）

### 新增

- 支持附加到 `CodexPlusPlus-no-dream-skin` 启动的 Codex：从 `latest-status.json` 读取动态 CDP 端口提示，并重新验证 browser identity、主 renderer target 和 loopback WebSocket。
- 主题壁纸兼容 Codex++ 1.2.45 当前的 `MainContentSurface` DOM，保留图片 Blob URL 注入和可读性遮罩。

### 修复

- 移除 Codex++ takeover、清理钩子和所有权轮询；皮肤工具只运行自己的一套主题 runtime，避免两个 runtime 互相覆盖导致闪烁。
- Codex++ host 改为 attach-only：必须先从 Codex++ 启动 Codex，皮肤工具不会接管或修改 Codex++ 安装。

### 验证

- `npm test`：7 个测试通过。
- `npm run lint`：通过。
- `npm run package`：Windows x64 打包通过。

## 上游参考

原项目（`vendor/` 里 `injector.mjs`/`bridge.ps1`/`selectors.json` 等的来源，未做修改直接拷贝）：
<https://github.com/Fei-Away/Codex-Dream-Skin>

本项目工作区曾保留过该项目源码副本（`A:\ClaudeWorkspace\CodexDreamSkin`），已删除；后续如需追新版本改动、对照原始实现，去上面的地址看。

## 未发布 — 2026-08-09（Codex++ 外部附加）

### 新增

- 支持附加到 [BigPizzaV3/CodexPlusPlus](https://github.com/BigPizzaV3/CodexPlusPlus) 启动的 Codex：读取 `%USERPROFILE%\.codex-session-delete\latest-status.json` 取得动态 `debug_port` 候选，优先顺序为该端口、Codex++ 默认 `9229`、旧 CodexBridge `9335`。
- 新增 CDP endpoint 预检：仅接受 loopback `ws:`/`wss:` URL 且 URL 端口必须和探测端口一致；同时验证 `/json/version` 的 browser ID 和 `/json/list` 中的主 Codex renderer，拒绝普通 HTTP 服务、远程地址、avatar overlay 与 quick-chat target。
- 接管 Codex++ 内置 Dream Skin：确认 Codex++ renderer marker 后才调用其 `window.__CODEX_PLUS_CLEAR_DREAM_SKIN__` 钩子，随后注入本应用已选主题并记录外部 owner 标记。不会修改 Codex++ 设置、主题偏好、安装目录或官方 Codex 安装包。
- renderer 重新创建或 Codex++ 再次写入内置皮肤时，常驻 CDP 会话检测 owner/revision 失效并重新执行上述受限接管过程。
- 连接状态和托盘状态显示当前 host 与已验证 CDP 端口；Codex++ 未运行时显示“从 Codex++ 启动”的提示，不会错误调用 CodexBridge 的 `bridge.ps1 start/stop`。
- 新增 `node:test` 覆盖状态文件端口解析、端口候选排序、CDP WebSocket 约束、Codex target 选择和动态端口 endpoint 验证。

### 保持兼容

- 原有 CodexBridge `9335` 探测、自动启动和停止路径保留不变。仅当连接到 Codex++ host 时改为 attach-only。
- `vendor/` 的主题 schema、CSS、payload 编译器和现有主题目录结构没有修改。

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
- 当时曾将创建/修改主题用的 Claude Code Skill 随仓库发布；后续已收敛为本机权威 Skill，由它直接引用本仓库 `vendor/` 运行时，避免维护双副本。

### 已知限制

- 首次连接建立仍需要 Codex 本身以调试参数重启一次；这是 CDP 注入的物理限制，与实现无关，Windows 版和 macOS 版一致存在。
- 「从图片创建主题」的可视化界面尚未实现,新建/修改主题仍通过 `dream-skin-theme-designer` skill 完成——这是有意为之，不重复造轮子。
