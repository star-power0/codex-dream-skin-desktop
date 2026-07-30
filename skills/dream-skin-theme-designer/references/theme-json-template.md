# theme.json 结构与隔离参考

一套本地主题通常有三个必需文件；正式分发包再加 `manifest.json`：

| 文件 | 本地主题 | 正式包 | 职责 |
|---|---:|---:|---|
| `theme.json` | 必需 | 必需 | 元数据、构图和颜色合同 |
| 壁纸图 | 必需 | 必需 | `image` 指向的同目录图片 |
| `theme.css` | 强烈建议 | 必需 | Safe CSS 局部补充与正文兼容规则 |
| `manifest.json` | 可选 | 必需 | 文件哈希、大小、发布信息 |

## 推荐完整结构

```json
{
  "schemaVersion": 1,
  "id": "preset-example",
  "name": "人类可读名称",
  "image": "background.png",
  "appearance": "dark",
  "art": {
    "focusX": 0.72,
    "focusY": 0.42,
    "safeArea": "left",
    "taskMode": "ambient"
  },
  "colors": {
    "background": "#202124",
    "panel": "#2d2e31",
    "panelAlt": "#37383c",
    "sidebar": "#4d4257",
    "accent": "#de738d",
    "accentAlt": "#e4b4bc",
    "secondary": "#59a8cf",
    "highlight": "#e1ba8e",
    "text": "#f5f5f5",
    "muted": "#b1b3c4",
    "line": "rgba(222, 115, 141, 0.26)",
    "success": "#4f8966",
    "danger": "#c45a5a"
  }
}
```

`sidebar`、`success`、`danger` 是可选色键：

- `sidebar` 只影响侧栏渐变；不写时严格回退 `panel`。
- `success` 只覆盖 Diff/Git 的新增成功语义；`danger` 只覆盖删除失败语义。
- `success`/`danger` 不写时，运行时不会注入这两个变量，也不会覆盖 Codex 原生绿/红。因此像大黑塔这种已满意主题不会因浅色主题的语义配色改动而变化。

其余十个键仍是完整主题的必填合同。字段的真实页面区域见 [color-role-mapping.md](color-role-mapping.md)。

## 元数据与构图字段

| 字段 | 范围/格式 | 调整效果 | 设计判断 |
|---|---|---|---|
| `schemaVersion` | 固定 `1` | 合同版本 | 不自行改版本号。|
| `id` | `a-z0-9`、点、连字符，3-64 字符 | 保存主题的稳定标识 | 一旦已有用户使用，不随名称优化而改。正式包必须与 manifest 对应。|
| `name` | 人类可读文本，最多 80 字符 | 托盘和主题列表显示 | 可用中文名；不参与颜色渲染。|
| `image` | 同目录相对图片名 | 壁纸资源 | 不指向外部绝对路径；改文件名必须同步改此字段。|
| `appearance` | `light` / `dark` / `auto` | 选择壳层明暗分支 | 新设计默认显式 `light` 或 `dark`，避免 `auto` 与原生外观混合导致结构色被重推导。|
| `art.focusX` | 0-1 | 壁纸水平焦点/定位 | 主体在右常用较大值，主体在左常用较小值。|
| `art.focusY` | 0-1 | 壁纸垂直焦点/定位 | 人脸、文字、关键物体不应被顶部或输入框遮住。|
| `art.safeArea` | `left` / `right` / `none` | 决定内容和壁纸主体的避让方向 | 主体在右填 `left`，主体在左填 `right`；居中或铺满填 `none`。|
| `art.taskMode` | `auto` / `ambient` / `banner` / `full` / `off` | 任务页壁纸遮罩力度/布局 | `auto` 才采用图片比例生成的默认建议；显式 `ambient` 适合内容优先；显式 `full` 适合人物/壁纸展示优先，使用共享沉浸层的低遮罩档；`banner` 用于横幅式任务展示；`off` 不展示任务页壁纸。该字段只影响当前主题。|

## 文案字段（每个主题独立，影响首页展示文字）

这些字段不参与颜色渲染，但**每个主题应有自己气质匹配的文案**，不要照抄默认值。

| 字段 | 位置 | 说明 |
|---|---|---|
| `tagline` | 首页壁纸区下方大字副标 | 主题气质一句话，例如 "A precision AI guardian for focused deep work."。深色科技主题用英文冷峻短句，浪漫/人物主题用中文。 |
| `quote` | 首页底部小字引语 | 通常留 `"MAKE SOMETHING WONDERFUL"` 即可，也可换成契合主题氛围的话。 |
| `statusText` | 右下角状态标签 | 显示为 "XXX ONLINE"，配合主题名。例如 `"SENTINEL ONLINE"`、`"DREAM SKIN ONLINE"`。 |
| `brandSubtitle` | 品牌副标题 | 通常固定为 `"CODEX DREAM SKIN"`，不需要修改。 |
| `projectPrefix` / `projectLabel` | 项目选择器前缀/标签 | 深色英文主题用 `"Select project · "` / `"◉  Select project"`；中文主题可改 `"选择项目 · "` / `"◉  选择项目"`。 |

**文案设计原则：** tagline 的语气要配得上壁纸的视觉气质——赛博科技用硬朗英文，古典写意用雅洁中文，人物写真用柔和中文短句。不要千篇一律留默认英文占位符。

## 色键的隔离边界

- 改 `sidebar`：只为侧栏建立环境感；不应改变 composer、dialog、建议卡或下拉菜单。
- 改 `panel`：会改变 composer、建议卡、下拉和其他核心表面；只有希望整个表面体系变化时才改。
- 改 `background`：会影响壁纸遮罩、主区边缘和阴影，是全局氛围变更，不是单一组件微调。
- 改 `text`/`muted`：影响多个页面的内容可读性，必须走完整对比度和实机正文回归。
- 改 `accent`：会影响当前导航、主按钮、焦点与部分图标，必须检查 sidebar 当前项。
- `accentAlt`/`secondary`/`highlight`：基础壳层未必自动可见；先在 `theme.css` 选择一个具体区域再调整它们。
- `success`/`danger`：只改代码 Diff/Git 的新增/删除语义色；必须同时声明、同时检查可区分性，不得代替 `accent`，也不应为没有 Diff 设计需求的主题强加这两个字段。

## `auto` 的限制

`appearance: "auto"` 适合明确要求跟随 Codex 外观的主题，但不适合需要精确控制的设计：原生浅/深外观、图片分析和旧主题兼容分支可能共同影响 `background`、`panel`、`panelAlt`、`text`、`muted` 的最终值。要让设计稿的结构色稳定落地，使用显式 `"light"` 或 `"dark"`。

## 单主题修改规则

1. 修改某个主题时，只写它自己的目录：`themes/preset-<slug>/theme.json` 与 `theme.css`。
2. 不要复制当前 `active-theme` 里的随机图片名回其他预设；应用主题会创建活动副本，这不是源主题。
3. 只有发现问题来自 `runtime/`、注入器或 Safe CSS 白名单时，才改共享运行时。共享运行时改动必须：
   - 先证明问题跨主题存在；
   - 为未声明新参数的旧主题保留回退行为；
   - 跑共享测试和同步检查；
   - 至少回归一个浅色主题和用户当前主题；
   - 更新项目 CHANGELOG。
4. 练手主题一律另存 `preset-<slug>-v2/`；不覆盖用户已调好的源主题。

## 正式包提示

要分发 ZIP 时，`manifest.json` 需包含每个文件的字节数和 SHA-256。更改 `theme.json`、`theme.css` 或图片后，旧 manifest 会失效，必须重新生成；本地保存主题不需要 manifest。
