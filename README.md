# Codex Dream Skin Desktop

常驻 Electron 桌面工具，给 [Codex](https://openai.com/codex/) 桌面客户端实时换肤：本机 CDP 注入，不修改官方安装包，不需要每次重开 Codex 都手动重新操作。

非 OpenAI 官方产品。基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)（MIT License）开发，详见下方「与上游项目的关系」和 [NOTICE.md](./NOTICE.md)。

## 它能做什么

- **常驻检测**：轮询 Codex 安装状态与 CDP 调试端口，检测到 CodexBridge 启动的 Codex 未运行时自动带调试参数拉起并注入当前主题；也可自动附加到 Codex++ 已启动的 Codex。
- **系统托盘 + 主窗口画廊**：深色沉浸式卡片界面展示所有已保存主题，点击直接切换,当前使用主题有「正在使用」角标。
- **实时切换,不用重启 Codex**：主进程直连 Chrome DevTools Protocol，`Runtime.evaluate` 直接把主题 payload 推给 Codex renderer。
- **可扩展主题库**：主题文件存在 `%LOCALAPPDATA%\CodexDreamSkin\themes\`，跟应用/项目源码完全解耦，装到哪个盘、迁移项目都不受影响。

## 快速开始

```bash
npm install
npm run start
```

首次运行需要让 Codex 以调试参数重启一次（应用会自动处理），之后每次启动都会自动检测并注入当前主题。

### 与 Codex++ 一起使用

本项目支持 [Codex++ no-dream-skin fork](https://github.com/star-power0/CodexPlusPlus-no-dream-skin) 启动的 Codex。启动顺序是先从无内置 Dream Skin 的 Codex++ fork 打开 Codex，本应用随后以 attach-only 方式自动附加；不会调用 CodexBridge 的启动或停止脚本，也不会修改 Codex++ 的设置、安装目录或主题文件。

Codex++ 默认使用 `9229`，但 Windows 端口冲突时会换成临时端口。本应用把 `%USERPROFILE%\.codex-session-delete\latest-status.json` 的 `debug_port` 仅作为候选提示，仍会重新校验本机 CDP 的 `/json/version`、`/json/list`、浏览器 ID、主 renderer target 和 loopback WebSocket 地址后才注入。

本应用只运行自己的一套主题注入 runtime，不再调用或接管 Codex++ 的旧 Dream Skin 清理钩子。Codex++ 的主题管理已从维护 fork 中移除，因此不会再出现两个皮肤 runtime 互相覆盖导致的闪烁。

打包成可分发的安装程序：

```bash
npm run package   # 生成 out/ 下的可执行目录
npm run make       # 生成 Windows 安装程序（MakerSquirrel）
```

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

vendor/                          原样拷贝自上游项目，未修改（见 NOTICE.md）
themes/                          随仓库自带的示例主题（三套，见下方说明）
skills/dream-skin-theme-designer/  创建/修改主题用的 Claude Code Skill
```

**关键设计**：不像上游项目那样启动一个外部子进程做注入，而是主进程直接持有 CDP WebSocket 连接、直接 `Runtime.evaluate`——没有文件系统或子进程当中间层，切换主题是一次内存内的直推。这次架构选择、以及此前踩过的两个坑（打包后 `RunAsNode` fuse 静默失效、`ws` 包在 Vite 打包后崩溃）都完整记录在 [CHANGELOG.md](./CHANGELOG.md)，供后续维护参考。

## 主题怎么创建

**不在这个 App 里做可视化「从图片创建主题」的界面**——这是有意为之，不重复造轮子。创建/修改主题走一个独立的 [Claude Code Skill](./skills/dream-skin-theme-designer/)，用 AI 对话的方式完成，产出的三件套（`theme.json` + 背景图 + `theme.css`）直接放进 `%LOCALAPPDATA%\CodexDreamSkin\themes\preset-<slug>\`，这个 App 常驻扫描该目录，新主题会自动出现在画廊里，不需要重启、不需要手动导入。

### 怎么用这个 Skill

在装有 [Claude Code](https://claude.com/claude-code) 的环境里，把 `skills/dream-skin-theme-designer/` 放进 skills 目录（或直接在有权访问这个仓库的对话里引用它），然后：

- **创建新主题**：说"帮我设计一个主题"或"给这张壁纸配色"，给出壁纸绝对路径。如果手头没有现成壁纸，也可以说"我还没有壁纸"，Skill 会先看你提供的参考图，套用构图规则（主体一侧、另一侧留低细节空间，方便侧栏/任务页遮罩），生成一版具体的中文生图提示词，拿去外部 AI 绘图工具生成后再回来继续。
- **修改现有主题**：说"帮我改一下 xxx 主题"，Skill 会先枚举当前所有主题给你选，再按你的目标（更亮、换壁纸、提高可读性……）做最小必要的修改，改完给一张改动前后对比表。

流程是：实测壁纸像素 → 看懂壁纸内容（主体、氛围、画风) → 按 `theme.json` 的十个配色维度分角色分配颜色（不是照抄壁纸像素）→ 对比度校验 → 写 Safe CSS 并跑校验器 → 落地到主题目录 → 在 App 里实机确认。每一步的具体规则、颜色字段和页面区域的对应关系、已验证过的踩坑经验，都写在 [SKILL.md](./skills/dream-skin-theme-designer/SKILL.md) 里。

**这个 Skill 不是一次性写完的规范，是持续迭代总结出来的**——每次设计新主题、改共享运行时代码遇到的问题和解决方式，都会被沉淀成规则写回 SKILL.md，或者记录进 [skill 自己的 CHANGELOG.md](./skills/dream-skin-theme-designer/CHANGELOG.md)（比如"明度微调等于没调"、"Safe CSS 不能有注释"这类规则，都是踩过坑之后加的），不是靠记忆或者临场发挥。

## 随仓库自带的主题

`themes/` 下有三套可以直接用的示例主题：

| 主题 | 来源 |
|---|---|
| Cyan Sentinel | 上游项目自带预设 |
| Gothic Void Crusade | 上游项目预设，壁纸由社区贡献者 [@seansong-ideogram](https://github.com/seansong-ideogram) 创作 |
| 小宵虎南·夜祭冷雅 | 本项目原创，用上面的 Skill 设计 |

涉及真实人物写真或游戏角色版权的主题未包含在仓库中。使用方法：把对应的 `preset-*/` 目录复制到 `%LOCALAPPDATA%\CodexDreamSkin\themes\` 下即可。

## 与上游项目的关系

本项目的换肤运行时（`vendor/` 目录）直接拷贝自 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)，包括 Codex 检测/启停脚本、Safe CSS 校验器、DOM 选择器契约、注入运行时 CSS/JS，全部未做修改——所有安全关键逻辑（Windows Store 包签名校验、CDP 端口归属校验）都沿用原实现。

本项目重新实现的部分是**外壳**：把原项目「安装脚本 + 桌面快捷方式」的交互方式，换成常驻 Electron 应用 + 系统托盘 + 主进程直连 CDP 注入。详见 [NOTICE.md](./NOTICE.md) 的完整归属说明和 [CHANGELOG.md](./CHANGELOG.md) 的每一步演进记录。

## 许可

MIT，见 [LICENSE](./LICENSE)。第三方素材、角色/人物图像的权利归属说明见 [NOTICE.md](./NOTICE.md)。
