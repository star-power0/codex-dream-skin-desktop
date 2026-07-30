---
name: dream-skin-theme-designer
description: >
  为 Codex Dream Skin（Windows/macOS 皮肤引擎）创建或修改主题。创建时给定壁纸路径，
  从像素实测出发分析配色，按 theme.json 的 10 个配色维度分别做角色合理的搭配（不是
  直接照抄壁纸像素颜色），产出 theme.json + theme.css + 校验通过的完整主题四件套；
  修改时先枚举现有预设，再按用户目标做最小修改并完成同等校验。使用场景：用户说
  "帮我设计一个主题/皮肤""给这张壁纸配色""修改主题""优化现有主题""Dream Skin 主题"
  "codex 皮肤配色"，或给了一张壁纸图片路径要求生成/优化 CodexDreamSkin 主题时。
---

# Dream Skin Theme Designer

给 Codex Dream Skin 设计主题 = 壁纸像素实测 + 参数职责映射 + 按角色分配色彩 + 对比度验证 + Safe CSS/实机校验。

> ⚡ **设计新主题时不改共享代码**。本技能含有两套规则：
> - **基础流程**（每次必走）：配色、对比度、Safe CSS、正文颜色验收——设计新主题时只需要这些。
> - **共享运行时规则**（仅改 `runtime/` 时参考）：回归旧主题、双壳验收、表面 token 桥接等——你不需要每次重复。

---

## 一、入口分流（每次使用技能先执行）

先让用户选择模式；若用户的请求已明确表达创建或修改意图，可以直接进入对应模式。

### A. 创建新主题

先问用户手头有没有现成壁纸：
- **有壁纸** → 直接提供绝对路径，进入下方「二、创建新主题流程」Step 1。
- **没有壁纸** → 请用户提供一张参考图（人物图、氛围图、色板、随手拍的照片都行，不必是能直接当壁纸用的成品），按下方「A0. 没有壁纸时：先出一版生图提示词」处理，拿到生成结果后再回到 Step 1。

缺少构图信息时，按 Step 1 继续确认，不要猜测。

#### A0. 没有壁纸时：先出一版生图提示词

1. 读参考图看内容，不是看它能不能直接用：主体是什么（人物/场景/物件）、氛围基调、色调、画风。这段理解会直接写进提示词里，不是走个形式。
2. 套用基础构图规则（这是 Dream Skin 通用的硬性要求，与主题风格无关，任何一张壁纸都要满足）：
   - 主体放在图片的一侧；不确定放哪边就先问用户，默认建议放右侧（多数主题侧栏在左，需要留白配合）。
   - 另一侧留出**低细节、低对比度**的空间——这块区域最终会被侧栏渐变和任务页遮罩盖住，画面越简单，遮罩后越干净；细节多、对比强的区域被遮罩会显得脏、显得没设计过。
   - 主体和留白区之间不要有强烈色块或高频纹理横跨整张图，否则不管最后 `art.safeArea` 选哪一侧都会露怯。
3. 把「参考图内容」和「构图规则」揉在一起，写成一条完整、具体的中文生图提示词——不是套模板填空，要针对这张参考图描述主体、氛围、色调、构图细节。如果用户没指定主体方向，给左置/右置两个变体，让用户挑一个去外部 AI 绘图工具生成。
4. 用户带着生成结果回来后，把它当正式壁纸路径，进入 Step 1。

### B. 修改现有主题

1. 扫描 `%LOCALAPPDATA%\CodexDreamSkin\themes\preset-*\theme.json`，逐项列出可修改主题的中文名、`id`、`appearance`、壁纸文件名与当前启用主题（可确定时）。
2. 请用户指定目标主题，并说明修改目标。示例：整体更亮、更换壁纸、调整强调色、提高正文可读性、修改侧栏氛围。
3. 读取目标预设的 `theme.json`、`theme.css` 和背景图；**主动跑 `extract_palette.py` 重新实测壁纸**，然后对照现有配色逐个审查以下结构性问题（不要只等用户描述）：
   - 交互色（`accent`/`secondary`/`highlight`）是否存在色相重叠，两个深暗红/两个同色系深色算重叠，需要拉开差异
   - 任何颜色是否对比度临界（`highlight` 这类暗色容易低于 3:1）
   - `background` 色温是否与壁纸主色调冷暖一致（石材/木质暖棕壁纸配冷中性黑会脱节）
   - `text` 是否有比纯白更贴合壁纸气质的色相（羊皮纸米白、冰蓝白等）
   发现问题后主动提出改动方向，用户说"你定方向"时直接给出分析和方案，不要反问。
4. 不更换壁纸时，基于现有配色和用户需求做最小调整，不强制重新进行完整取色；但凡涉及文字、表面或轮廓颜色，仍必须运行对比度校验。
5. 更换壁纸时，补充确认新壁纸路径、焦点、主体左右位置、构图和是否需要独立 `sidebar`，然后按下方创建流程的 Step 2 至 Step 7 重新执行。
6. **改动完成后必须列出前后对比表**（旧值 → 新值 → 改动说明），让用户清楚每个键的变化幅度和原因；幅度太小的改动要主动说明为什么不大幅调整，而不是让用户自己发现。
7. 无论修改内容为何，最终都必须执行适用的对比度检查、Safe CSS 校验和实机验证；实机验证完成后再交付。

---

## 二、创建新主题流程（原基础流程）

### Step 1：确认输入

用户提供壁纸路径。同时确认（缺了就问，不要猜）：
- 主体人像/焦点大致在图片哪个位置（用来填 `art.focusX`/`art.focusY`；没有明显主体、纯风景/图案就用居中 0.5/0.5）。
- 主体在左还是右（决定 `art.safeArea`），以及任务页想保留多少壁纸可见度（决定 `art.taskMode`）。先读下方「任务页模式：单主题选择与遮罩范围」，不要只按图片宽高猜。
- 主题名字（中文名即可，`id` 可以用拼音/英文 slug）。
- 这张壁纸需要独立侧栏色吗？通常不需要，`sidebar` 不写时自动回退 `panel`，很方便。

#### 任务页模式：单主题选择与遮罩范围

`art.taskMode` 是**单主题**元数据：改某个 preset 的值，只影响该主题；不改其他主题，也不改共享运行时。它控制宽图在普通任务/对话页（`main.main-surface` 没有首页 `[role="main"]`）的壁纸组合方式；首页等宽图主界面按各自的 DOM 路由规则组合壁纸。

运行时会从图片比例生成 `artMetadata.taskMode` 建议（普通宽图通常建议 `ambient`，超宽图通常建议 `banner`），但它**只是默认值**。只要主题显式写入 `art.taskMode` 且不为 `auto`，**主题显式值优先**；payload 同时出现 `art.taskMode: "full"` 与 `artMetadata.taskMode: "ambient"` 不表示回退或冲突。

当前深色运行时的已验证遮罩强度如下（从左侧内容区 → 中部 → 右侧人物区）：

| `taskMode` | 任务/对话页主区域遮罩 | 适用判断 |
| --- | --- | --- |
| `ambient` | `82% / 74% / 60%` 深色环境遮罩 | 优先保障长文本与代码阅读；右侧人物会明显压暗。|
| `full` | `40% / 26% / 16%` 深色环境遮罩 | 人物/壁纸展示优先；右侧通透度采用共享宽图沉浸层的低遮罩档，左侧仍保留可读性渐变。|
| `banner` | 与 `ambient` 同级遮罩，但用于横幅式任务展示 | 只在希望壁纸作为横幅氛围、而非整页人物展示时选。|
| `off` | 不显示任务页壁纸 | 仅内容优先场景。|

- 人物宽图想让普通对话页接近新建任务页的通透度：**在该主题里用 `"taskMode": "full"`**。
- `ambient` 是默认的保守选择，不等于“所有人像都应该用”；先问用户要可读性还是人物可见度。
- 不要仅降低 `theme.css` 的 header/composer/dialog 透明度来提亮人物：这些是局部浮层，不能改变任务页主区域遮罩。
- 这些百分比来自共享 `dream-skin.css` 的模式规则。**不要为单一主题改共享 `ambient` 或 `full` 数值**；这会改变所有使用相应模式的主题。若只需一个主题变亮，优先切换该主题的 `taskMode`。
- 视觉验收至少对比两个状态：宽图首页/新建任务页，以及普通任务或对话页。前者与后者命中的运行时选择器不同；只在一个页面截图通过，不能证明壁纸遮罩符合预期。

### Step 2：实测壁纸

```bash
python skills/dream-skin-theme-designer/scripts/extract_palette.py <壁纸绝对路径> --focus-x <0-1> --focus-y <0-1>
```

输出三组数据：`dominant`（整图量化色板）、`left_safe`（x=0-52% 安全区）、`subject_zone`（focusX/focusY 附近的主体区域）。同时给出 `overall.left_safe_reads_as` 判断这张图左侧整体偏亮还是偏暗。

### Step 3：按角色分配颜色（核心——必须读参考文档）

> ⚠️ **这一步不允许凭直觉填色。** 必须先读参考文档确认每个字段的实际渲染位置，再对着壁画实测数据逐个决定。

**先看懂这张壁纸画的是什么，再动色号。** `extract_palette.py` 只给像素统计，不懂内容；同一组 RGB 均值，画的是深夜街景还是晴天草原，配色策略完全不同。用 Read 工具看一遍壁纸原图，判断：
- 主体是什么（人物/场景/物件/纯图案），氛围基调（冷峻、温暖、梦幻、肃穆……），画风（写实/插画/像素/水墨……）。
- 这个内容气质对应什么样的配色倾向——不是让壁纸颜色反过来限制配色，而是让最终配色"像是长在这张画里"，与后面「配色铁律」第 12 条呼应。
- 把这一判断记下来，Step 3 后续每个字段的选择都要能对上这个判断，不能看完就忘、回头还是纯按像素数值机械填色。

**再读 `skills/dream-skin-theme-designer/references/color-role-mapping.md`，重点是三张表：**
- 「颜色字段总表」—— 字段 → 运行时变量 → 实际页面区域 → 设计约束
- 「真实页面区域」—— 侧栏渐变怎么算的、composer 读哪个变量、正文怎么上色的
- 「参数组合策略」—— 先分环境/表面/交互/文字再搭配的顺序

**再对照 `skills/dream-skin-theme-designer/references/theme-json-template.md` 确认完整结构：**
- 十个必填色的隔离边界：改了哪个会影响什么
- `sidebar`/`success`/`danger` 三个可选色的预期行为
- 元数据和构图字段的合理范围

按以下顺序逐个决定：

1. 先定 `appearance`。主题必须显式写 `"light"` 或 `"dark"`，不要用 `"auto"`（auto 会让运行时插一脚重新算结构色）。
2. 环境与表面色：`background` → `panel` → `panelAlt`，以实测数据为基础推一套同色系、明度分明的中性色，不是照搬某条采样。（`panel` 会影响 composer、建议卡、下拉和弹窗，不在其中混入侧栏偏好。）
3. 侧栏：是否需要独立 `sidebar`？只有壁纸安全区和核心表面色差太大、侧栏需要更贴近壁纸时才写。不写时自动回退 `panel`，省时又安全。
4. 交互色：从 `dominant`/`subject_zone` 挑 2-4 个色相区分度够高的颜色填入 `accent`/`accentAlt`/`secondary`/`highlight`。必须给每个非 accent 交互色想好它在哪个 CSS 区域出现（不然写了也不可见）。
5. 语义色（可选）：`success`/`danger` 只在需要覆盖 Diff 绿/红时才写，且必须成对出现。不写就保留 Codex 原生绿红。
6. 文字与轮廓：`text`/`muted`/`line` 由上面定好的表面反推。`text` 对三种表面至少 4.5:1，`muted` 对 `panel` 也尽量 4.5:1。

写出完整 `theme.json`（结构照 `skills/dream-skin-theme-designer/references/theme-json-template.md`）。

### Step 4：对比度校验（跑不过不能交付）

```bash
python skills/dream-skin-theme-designer/scripts/check_contrast.py <theme.json>
```

任何 `[FAIL]` 必须回 Step 3 重调，直到全部 `[OK]`。

### Step 5：写 Safe CSS 并校验

复制 `skills/dream-skin-theme-designer/assets/safe-css-template.css` 为新主题的 `theme.css`。

- 只调数值（不透明度、阴影、颜色），不引入模板外的选择器或变量。
- **Safe CSS 不能写 `/* 注释 */`**，校验器会把注释当语法拒绝。
- 模板里的 `[data-ds-part="message"]` 和 `[data-ds-part="thread"]` 不能删——这是正文文字实际颜色的唯一保障。

写完跑实际校验：

```bash
node "A:\ClaudeWorkspace\codex-dream-skin-desktop\vendor\scripts\validate-safe-css-file.mjs" <theme.css>
```

返回 `"status":"validated"` 才算过。校验器随桌面项目一起走 `vendor/`，不依赖任何已安装的运行时目录。

### Step 6：落地 + 实机验证

把三个文件放进 `%LOCALAPPDATA%\CodexDreamSkin\themes\preset-<slug>\`（桌面 App 就是从这里枚举主题的）。

在 Codex Dream Skin 桌面 App 里点选新主题（主窗口卡片或托盘「切换主题」），然后至少确认：
1. 正文实际颜色 = 你设计的 `text`（CDP 读 computed color，不要只看 theme.json）。
2. composer 背景来自 `panel`。
3. 侧栏渐变看起来不是全灰的（如果需要独立 `sidebar` 的话）。

### Step 7：命名落地目录

```text
%LOCALAPPDATA%\CodexDreamSkin\themes\preset-<slug>/
├── theme.json
├── background.png  （文件名与 theme.json.image 一致）
├── theme.css
```

告诉用户可以直接在桌面 App 里点选（主窗口卡片或托盘菜单），不需要 ZIP 导入。App 常驻检测目录，新主题会自动出现在列表里。

---

## 三、配色铁律（每次必遵守）

如果你记不住所有细节，至少记住这几条：

1. **禁止凭经验挑色号**——必须跑 `extract_palette.py` 实测壁纸。
2. **禁止把壁纸主色直接套进每个维度**——壁纸深，文字就不能深；壁纸某处是粉色不代表 `text` 也该是粉色。
3. **对比度必须数值过关**——`[FAIL]` 不交付。
4. **对比度数值 OK ≠ 画面真的用了你的色**——正文颜色必须实机 `getComputedStyle` 确认，光看工具报告不算。
5. **Safe CSS 不能有注释**。
6. **`appearance` 必须显式写 `"light"` 或 `"dark"`**，不要 `"auto"`。
7. **单主题的改动只写入自己的 preset 目录**，不碰别的预设。
8. **`panel` 不是侧栏色**——`panel` 影响 composer、建议卡、弹窗，不是用来调侧栏的。侧栏需要独立色就写 `sidebar`。
9. **非 accent 交互色不会自动可见**——`accentAlt`、`secondary`、`highlight` 必须在 Safe CSS 里有具体落点。
10. **`success`/`danger` 只在需要重配 Diff 色时才写**，不写就保留原生绿红。
11. **不为改而改，但要主动找好看的搭配**——不是"每个键都要动一下"，也不是"没明确理由就一律不动"。每个颜色维度都要主动想一遍"有没有更好看、更贴合这张壁纸气质的搭配"；想到了就换，想不到就保持原值。尤其是 `text`/`muted` 这类文字色，不能因为白色/浅灰"能用"就停止思考——白色确实常常是对的答案（黑底配纯白正文本身就好看），但也要认真比较一下壁纸里有没有一个带轻微色相的白（偏冷调蓝白、偏暖调米白）会更有整体感、更不像是随手抓的默认值。
12. **背景/表面色要与壁纸气质一致，但不必是壁纸像素的复刻**——`background`/`panel`/`panelAlt` 这类维护环境感的颜色，目标是让整套 UI 感觉"长在这张壁纸上"，不是让用户觉得"这就是从壁纸截了一块色"。可以比壁纸更纯净、更克制，但色相、冷暖、氛围要能对上；纯中性灰、和壁纸完全不搭的色相都算没做到位。
13. **明度微调等于没调**——人眼分辨不出 `#edf7fb` 和 `#e6f1f7` 这种个位数的明度差。真正找到更合适的颜色时，要调到有感知区别的幅度（换色相、换到另一档明度台阶）；如果反复权衡后确实没有能带来可感知提升的方案，直说"这个维度没找到更合适的颜色，保留原值"，不要硬凑一个看不出区别的数字。改之前先问自己："这个改动重新截图对比后丞相能看出来吗？"

---

## 四、共享运行时规则（仅改 vendor 运行时时参考）

**基础流程不需要这些。** 只有确认问题是运行时层面的（`dream-skin.css`、`renderer-inject.js`、Safe CSS 白名单等）才要读这一节。

共享运行时现在位于桌面项目 `A:\ClaudeWorkspace\codex-dream-skin-desktop\vendor\`：`assets\dream-skin.css`、`assets\renderer-inject.js`、`assets\safe-css-policy.json` 等。这是唯一一份，改完即生效（下次启动 App 重新注入），没有"源文件 → 安装目录"的同步环节。

### 改共享代码的铁律

- 改共享代码前先证明问题是跨主题存在的，不是单一预设配色。
- 新扩充的能力（新增 CSS 变量、选择器、token 桥接）必须让旧主题不声明新字段时**严格回退旧行为**。
- **必须在实机验证至少三个主题：当前主题、一个浅色预设、一个未声明新字段的深色预设。**
- 改完后更新桌面项目的 `CHANGELOG.md`，记清楚改了什么、为什么、影响了哪些主题。
- 改完 `vendor/` 后要重启桌面 App（或重新打包）才会带上新的运行时资源。

### 已确认的运行时能力（改新主题时不需要验证这些）

这些已经验证稳定，**任何新主题都自动继承**，不用逐条检查：

- ✅ 正文颜色通过 `--ds-text` 强制映射（`_markdownText_` 节点）
- ✅ 浅色主题的原生标注（模型选择、菜单、代码卡）不再白字
- ✅ 深色主题的原生标注（模型选择、命令记录、侧栏历史）不再继承宿主紫色
- ✅ 设置页底色走主题 `background`，不是白色
- ✅ 变更摘要胶囊底色走主题 `panel`
- ✅ `sidebar` 未声明时回退 `panel`，不影响已有预设
- ✅ `success`/`danger` 未声明时不注入，保留原生绿红
- ✅ 方图/竖图/非宽图不再有原生黑边
- ✅ 双端运行时产物完全一致

因此设计新主题时**不需要回归旧主题**。切换过去看新主题自己的效果即可。

### runtime 文件自检清单

如果怀疑是运行时 bug 而非新主题配色问题，检查：

```bash
# 开发模式跑的是 vendor/ 源文件；打包产物在 resources/vendor/，两者应一致
sha256sum "A:\ClaudeWorkspace\codex-dream-skin-desktop\vendor\assets\dream-skin.css"
sha256sum "A:\ClaudeWorkspace\codex-dream-skin-desktop\out\codex-dream-skin-desktop-win32-x64\resources\vendor\assets\dream-skin.css"
```

不一致说明打包产物是旧的，重新 `npm run package` 即可；开发模式（`npm run start`）直接读 `vendor/`，不受影响。

---

## 资源

- `skills/dream-skin-theme-designer/scripts/extract_palette.py`：壁纸像素测量，依赖 Pillow。
- `skills/dream-skin-theme-designer/scripts/check_contrast.py`：读 theme.json 校验对比度。
- `skills/dream-skin-theme-designer/scripts/wcag.py`：颜色计算函数。
- `skills/dream-skin-theme-designer/references/color-role-mapping.md`：字段 → 变量 → 页面区域 → 设计约束。
- `skills/dream-skin-theme-designer/references/theme-json-template.md`：完整 theme.json 结构和隔离边界。
- `skills/dream-skin-theme-designer/assets/safe-css-template.css`：跑过校验器的 Safe CSS 起始模板。
