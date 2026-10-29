# 项目约定

本文记录命名、提交、版本和发布规则。目标是让 UI、文档、代码和 Git 历史使用同一套语言。

## 产品命名

| 场景 | 统一命名 |
|---|---|
| 中文产品名 | 快捷键卡片 |
| 英文产品名 | Edge Shortcut Card |
| GitHub 仓库 | `edge-shortcut-card` |
| 简称 / 前缀 | `ESC` |
| 扩展 manifest 名称 | Edge 快捷键卡片 |

不再使用“快捷键助手”“快捷键卡”“Shortcut Card”等变体。

## UI 文案

| 场景 | 统一叫法 |
|---|---|
| 收起后的贴边元素 | 胶囊 |
| 胶囊里的快捷键 | 快捷键提示 |
| F8 的行为 | 已试 |
| F2 的行为 | 按键录入 |
| 官方页入口 | 官方说明 |
| 输入框上方的快捷条 | 输入框上下文 |
| 排序按钮 | 频率 |
| 最近记录 | 最近 |
| 页面场景 | 场景 |

避免使用与当前实现不符的词：

- 不用“今日 / 每日”（提示不是每天一条）；
- 不用“随机”（当前是按评分推荐）；
- 不用“收藏 / 常用分组”（没有这些功能）；
- 不用“执行”（插件只查不执行）。

## 代码与存储命名

- 消息类型：`ESC_*`，例如 `ESC_TOGGLE_CARD`、`ESC_GET_STATS`；
- 覆盖层标识：`__ESC_CARD_OVERLAY__`；
- 存储键：保持 `edgeShortcut*` 前缀，例如 `edgeShortcutSearchStats`、`edgeShortcutTipIndex`；
- 新增存储键沿用 `edgeShortcut*`，不要单独起 `esc*` 或 `shortcut*`；
- **不要直接重命名已发布的存储键**。如果必须迁移，先写迁移逻辑，再单独提交，不和其他功能混在一起；
- CSS 类、函数和变量优先使用 `card`、`pill`、`tip`、`capture` 等语义名；
- 文件保持 `manifest.json`、`background.js`、`content.js`，不引入构建产物。

## 提交规范

采用 Conventional Commits，提交主题使用英文：

```text
type(scope): subject
```

- `type`：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`style`、`perf`；
- `scope` 可选，但推荐写；
- `subject` 用英文、祈使语气、小写开头，不加句号；
- 正文可以用中文，说明“为什么”和“验证了什么”；
- 一次提交只做一件逻辑上的事；
- 不为了“好看”把无关改动塞进同一个提交。

### Scope

| Scope | 范围 |
|---|---|
| `pill` | 收起胶囊、提示轮换、F8 |
| `card` | 卡片布局、展开/收起、拖动 |
| `search` | 模糊搜索、别名、排序 |
| `capture` | F2 按键录入、Plus/Minus |
| `tips` | 个性化、场景推荐、已试记录 |
| `official` | 官方说明链接和 Alt+O |
| `docs` | README、设计说明、本文件 |
| `release` | 版本号和发布 |
| `a11y` | 键盘、焦点、可访问性 |
| `style` | 纯视觉调整，无行为变化 |

### 示例

```text
feat(pill): show F8 keycap on collapsed hint
feat(tips): weight recommendations by page context
feat(official): open official docs with Alt+O
fix(capture): map equals key to Plus
docs(readme): rewrite around motivation and design
docs: add naming and commit conventions
chore(release): v1.10.0
```

## 版本与发布

使用 SemVer：

- `PATCH`：修复，不改变行为约定；
- `MINOR`：向后兼容的新功能；
- `MAJOR`：破坏性变更，例如重命名存储键或改变核心交互。

规则：

1. 功能完成并通过测试后，更新 `manifest.json` 和 `content.js` 的版本号；
2. 提交功能改动；
3. 打标签 `vX.Y.Z`；
4. 推送 `main` 和标签；
5. 需要分发时，在 GitHub Releases 上传 ZIP。

不要在没有测试的情况下打标签。

## 开发流程

1. 先讨论需求、交互和边界；
2. 确认方案后再改代码；
3. 改完运行检查；
4. 提交、打标签、推送；
5. 在 README 或设计说明中记录行为和边界。

最低检查：

```powershell
node --check content.js
node --check background.js
```

涉及 UI / 键盘交互时，用无头 Edge 验证：

- 搜索和选中；
- F2 按键录入；
- F8 已试；
- Alt+O 官方说明；
- 收起 / 展开 / 隐藏。

临时测试目录不要提交；提交前确认 `git status` 干净。

## 历史

已发布的提交历史不回写。  
从引入本约定开始，新提交按本文执行。
