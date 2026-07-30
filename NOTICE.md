# Notices

Codex Dream Skin Desktop 是一个**非官方**的 Codex 换肤桌面工具，**与 OpenAI 无关联、未获其认可**。

## 项目关系

本项目基于 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)（MIT License）开发。

`vendor/` 目录下的以下文件原样拷贝自该项目，未做任何修改：

- `vendor/scripts/injector.mjs`、`image-metadata.mjs`
- `vendor/scripts/common-windows.ps1`、`theme-windows.ps1`、`config-utf8.ps1`
- `vendor/assets/theme-package-validator.mjs`、`safe-css-validator.mjs`、`safe-css-policy.json`
- `vendor/assets/selectors.json`、`renderer-inject.js`、`dream-skin.css`

Windows Store 包签名校验、CDP 端口归属校验、进程安全性检查等安全关键逻辑均沿用原项目实现，本项目未重写。

本项目的原创部分是：常驻 Electron 主进程架构、系统托盘、深色主题画廊 UI（React + TypeScript + Vite）、主进程直连 CDP 的注入方式（`src/main/injection-manager.ts`，替代原项目的外部注入子进程），详见 [CHANGELOG.md](./CHANGELOG.md)。

## 软件许可

`LICENSE` 中的 MIT License 适用于本仓库的**软件源代码**（脚本、样式、注入逻辑、文档），包括从上游原样拷贝进 `vendor/` 的部分（上游同样为 MIT）。

以下内容**不在** MIT 授权范围内：

- OpenAI 或 Codex 的商标、产品名称、Logo
- 官方 Codex / ChatGPT 应用二进制、`.app`、`app.asar`
- 任何主题壁纸中的角色/人物图像、其原始版权或肖像权

## 随仓库主题

`themes/` 目录下随仓库提供三套主题作为示例/原始主题：

| 主题 | 来源 | 说明 |
|---|---|---|
| `preset-cyan-sentinel` | 上游 [Fei-Away/Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin) 预设 | 抽象几何风格，无角色 |
| `preset-gothic-void-crusade` | 上游预设，壁纸由 [@seansong-ideogram](https://github.com/seansong-ideogram) 创作并贡献给上游项目（[PR #134](https://github.com/Fei-Away/Codex-Dream-Skin/pull/134)） | 哥特科幻风格，无真实人物/版权角色 |
| `preset-xiaoxiao-hunan-night-festival`（小宵虎南·夜祭冷雅） | 本项目作者用 `skills/dream-skin-theme-designer` 原创设计 | 原创壁纸与配色 |

有肖像权或版权风险的主题（真人写真、游戏角色等）**未包含**在本仓库中，仅作者本地使用。

## 安全模型

主题通过 Chrome DevTools Protocol 在 `127.0.0.1` 本机回环地址注入，不修改 Codex 官方安装目录或代码签名。运行期间请勿在本机跑来路不明的程序连接该调试端口。
