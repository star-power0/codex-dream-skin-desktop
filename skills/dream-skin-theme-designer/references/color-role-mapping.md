# 主题参数与真实渲染链路

本参考以当前 Dream Skin 运行时为准。主题设计不是“壁纸提取十几个颜色后逐个填空”，而是先确认每个字段会进入哪个 CSS 变量、由哪些组件读取、是否需要 Safe CSS 才看得见，再按职责设计。

## 先看这条链路

```text
theme.json.colors
  -> renderer-inject.js 解析/回退
  -> --ds-* 私有变量和 RGB 变量
  -> runtime/dream-skin.css 基础壳层
  -> theme.css Safe CSS 局部补充
  -> 实机 computed style / 截图验收
```

`theme.json` 有 **10 个必填颜色键**，以及两个互不相关的可选颜色键：`sidebar`（侧栏环境色）与 `success`/`danger`（成功/失败语义色）。所有预设不写 `sidebar` 时，运行时会让它精确回退为 `panel`；不写 `success`/`danger` 时，不会覆盖 Codex 原生 Diff 绿/红。因此旧主题不会因为新增能力改变外观。

## 颜色字段总表

| 字段 | 运行时变量 | 基础 CSS 中实际区域 | 能否独立调整 | 设计约束 |
|---|---|---|---|---|
| `background` | `--ds-bg` / `--ds-bg-rgb` | body、主区域底色、任务页 scrim/veil/阴影、壁纸渐隐 | 可以 | 是全局环境色，不承担表面层次；深色图不等于必须纯黑，亮色图不等于必须纯白。|
| `panel` | `--ds-panel` / `--ds-panel-rgb` | composer、首页建议卡、下拉/弹出表面、部分沉浸 chrome | 可以，但**不能当侧栏色用** | 是核心可读表面。调整它会连带输入框、建议卡、弹窗；必须保证 `text`、`muted`、`accent` 与它对比足够。|
| `panelAlt` | `--ds-panel-2` / `--ds-panel-2-rgb` | 下拉列表 hover、沉浸 composer 实色变体、次级表面 | 可以 | 只负责相邻层次，通常比 `panel` 略亮/略暗或略有色相偏移；不要用成第二个强调色。|
| `sidebar`（可选） | `--ds-sidebar` / `--ds-sidebar-rgb` | 左侧栏默认渐变、ambient/banner/full 沉浸侧栏渐变 | **可以，且只应改这里** | 用安全区的低饱和环境色，允许比 `panel` 更贴近壁纸。未写时回退 `panel`。绝不可为了侧栏去改 `panel`。|
| `accent` | `--ds-green` / `--ds-accent-rgb` | 当前导航项、hover 图标、主操作、光标、首页建议卡图标/描边、滚动条 | 可以 | 小面积主强调。与 `panel` 至少 3:1；避免把大面积背景也做成同色，否则“全屏一个颜色”。|
| `accentAlt` | `--ds-lime` / `--ds-accent-soft` | 基础壳层当前几乎不直接消费；Safe CSS 可显式引用 `--ds-theme-color-accent-alt` | 可以，但需要 CSS 接入 | 不是自动可见颜色。作为柔和描边/次级焦点备用色；不应拿来替代正文或面板。|
| `secondary` | `--ds-cyan` / `--ds-secondary-rgb` | 左侧“切换模式”按钮后的点；Safe CSS 可用于 composer focus/toolbar hover | 可以 | 与 `accent` 保持可辨识的色相差，不要只做更深/更浅的同一紫色。若要可见，需在 Safe CSS 有意识接入。|
| `highlight` | `--ds-purple` / `--ds-highlight-rgb` | 基础壳层当前不直接消费；Safe CSS 可用于 dialog 边框等 | 可以，但需要 CSS 接入 | 适合暖金、亮青等第三色，承担“关键状态/边界”而非又一个主按钮色。必须有具体 CSS 使用点。|
| `text` | `--ds-text` / `--ds-text-rgb` | body、侧栏文字、首页内容、消息 markdown 正文、dropdown 前景、composer 输入 | 可以 | 主要正文色；对 `background`、`panel`、`panelAlt` 都必须 >= 4.5:1。不能依据壁纸像素直接填。|
| `muted` | `--ds-muted` / `--ds-muted-rgb` | 侧栏 placeholder/SVG、composer 工具栏、dropdown 次级说明、沉浸线条 | 可以 | 次级信息不是“随便淡一点”。对 `panel` 和实际 sidebar 背衬也应尽量 >= 4.5:1；深色主题最容易在此翻车。|
| `line` | `--ds-line` / `--ds-line-rgb` | 主区/侧栏边界、下拉边框、Safe CSS 边框 | 可以 | 通常取 `accent` 的低透明版本或中性分隔色。目的是区分层级，不应抢过正文和强调色。|
| `success`（可选） | `--ds-success` | Diff 增加行数、Git added decoration；仅显式声明时覆盖原生绿色 | 可以 | 只表达“新增/成功/通过”，不替代 `accent`。浅色主题需从壁纸挑协调且与 `danger` 明确可区分的绿/青绿。|
| `danger`（可选） | `--ds-danger` | Diff 删除行数、Git deleted decoration；仅显式声明时覆盖原生红色 | 可以 | 只表达“删除/失败/危险”，不替代主强调。浅色暖主题可用陶红，冷主题可用信号红。|

## 真实页面区域：不要按名字猜

### 侧栏

基础运行时的侧栏背景是：

```css
linear-gradient(
  rgb(var(--ds-sidebar-rgb) / .98),
  rgb(var(--ds-bg-rgb) / .96)
)
```

因此：

- 想让侧栏比主区更贴壁纸，用 `sidebar`，不是 `panel`。
- `sidebar` 必须维持与 `text`、`muted`、当前项 `accent` 的可读性。
- 当前项背景使用 `accent` 的低透明度；若 `accent` 与 `sidebar` 太接近，选中态会消失。

### Composer、建议卡和下拉表面

这些主要读 `panel`/`panelAlt`：

- composer 是 `panel-rgb` 的高不透明度表面；
- 首页建议卡是 `panel-rgb` 半透明表面；
- dropdown 背景直接读 `panel`，其 hover 读 `panelAlt`。

所以想“只改善侧栏”时，`panel` 不应变化。改变 `panel` 之前必须检查 composer、建议卡、dialog 和下拉菜单，而不是只看左侧栏。

### 正文与次要文字

- 基础运行时将消息 markdown 文本强制映射到 `--ds-text`；
- Safe CSS 模板仍保留 `thread`/`message` 的 `color`，用于兼容 DOM 变动；
- `text` 只有实机 `getComputedStyle` 等于预期，才算真正接上；
- `muted` 出现在工具栏、placeholder、图标和次要说明，不能只用裸 `background` 算对比度，要同时看 `panel` 和侧栏。

### accent、secondary、highlight 的可见性

当前基础壳层大量使用 `accent`，但 `accentAlt` 与 `highlight` 没有自动的大面积展示点，`secondary` 也只自然用于极少量的模式标识。因此必须先决定它们的具体 CSS 归宿：

| 颜色 | 建议 Safe CSS 归宿 | 不要做什么 |
|---|---|---|
| `accent` | 默认焦点边框、主按钮、当前导航项 | 不要再用于大面积面板/背景 |
| `accentAlt` | 柔和 hover 边框、次级标记 | 不要假设填了就自动出现 |
| `secondary` | composer `:focus-visible`、toolbar `:hover` | 不要与 accent 同色相只改亮度 |
| `highlight` | dialog 边框、关键确认/状态描边 | 不要用作普通正文或全局背景 |

## 参数组合策略

### 1. 先分“环境色、表面色、交互色、文字色”

- 环境：`background`、`sidebar`
- 表面：`panel`、`panelAlt`
- 交互：`accent`、`accentAlt`、`secondary`、`highlight`
- 文字与轮廓：`text`、`muted`、`line`

同一组中可以相邻；不同组不要全部从壁纸同一个色相直接复制。例如烟花壁纸可以是灰紫环境 + 中性灰表面 + 玫红主交互 + 蓝青辅助交互 + 金色关键描边，而不是十一处不同明度的紫色。

### 2. 配色顺序

1. 从 `left_safe` 判定亮/暗壳；先定 `appearance`。
2. 先定 `background`，再定 `panel`/`panelAlt`，先验证文字可读性。
3. 仅当侧栏需要独立环境感时定 `sidebar`；否则不写该键，让它回退 `panel`。
4. 从 `dominant` 和 `subject_zone` 选择 2-4 个**色相不同**的交互颜色，并为每一个写清具体使用点。
5. 最后反推 `text`、`muted`、`line`，运行对比度工具。

### 3. 明度方向不是死规则，但职责不能颠倒

- 暗壳常见方向：`background` 最暗，`panel` 稍亮，`panelAlt` 再区分一层，`text` 近白。
- 亮壳常见方向：`background` 浅，`panel` 更干净，`panelAlt` 用于轻微压低的 hover/层次，`text` 近黑。
- 侧栏不必严格跟随 `panel`，但不能让选中态、文字和图标看不清。

## 对比度与实机验证

`check_contrast.py` 的最低门槛：

- `text` 对 `background`/`panel`/`panelAlt` >= 4.5:1；
- `muted` 对 `background`/`panel` 优先 >= 4.5:1；
- `accent`、`highlight` 对 `panel` >= 3:1。

它没有覆盖 `sidebar`，设计者必须额外检查：

- `text` 对实际 sidebar 渐变顶端；
- `muted` 对实际 sidebar 渐变顶端；
- `accent` 对 sidebar 当前项底色。

最终用 CDP/截图确认：

1. 正文 computed `color` 等于 `text`；
2. composer 背景来自 `panel`，没有因侧栏调整变色；
3. 左侧栏渐变起始色来自 `sidebar`（或未声明时 `panel`）；
4. 当前导航项、焦点框和 dialog 边框分别读到预期交互色。

## 常见误区

- `panel` 不是“所有面板和侧栏的统一颜色”。
- `accentAlt`/`highlight` 不是填了必然可见的“自动主题色”。
- `success`/`danger` 不是 `accent` 的替身：它们只处理代码 Diff/Git 的新增和删除语义，默认不声明，避免未设计语义色的主题被共享运行时污染。
- 数学对比度通过不代表 DOM 选择器真的命中正文。
- 修改一个预设时，不要顺带覆盖另一个预设的 `theme.json`/`theme.css`；共享运行时修改必须有跨主题回归。
