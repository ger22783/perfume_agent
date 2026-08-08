# iGEM Perfume Agent

面向消费者的**个性化定制香水**软件。用户输入想要的感觉，Agent 在几十秒内把语言解析成**目标香气向量**，用**约束优化**从原料库中求解出最贴近需求的配方，展示逐维匹配误差；用户确认后，配方一键下发到 Aromacell，由 Aromacell 按比例自动调配出专属于你的香水。

## 使用流程

```
输入想要的感觉（清爽 / 水感 / 木质 / 甜暖…）
  → 几十秒生成配方（约束优化 + 逐维误差展示）
  → 「确定」：配方发送到 Aromacell 自动调配出香水
  → 「继续修改」：按输入框里的新需求调整配方
  → 「重新生成」：清空会话，从全新需求开始
```

## 核心思想

> 从「LLM 生成配方」→「语言理解 + 香气向量 + 约束优化」

配方比例**不再由 LLM 决定**，而是由可量化的数学求解得出：

```
用户自然语言
  → 意图解析（LLM 可选 / 本地规则兜底）
  → 目标香气向量 y（7 维��清爽/甜感/花香/木质/水感/温暖/强度）
  → 原料香气矩阵 A（每种原料的标定向量）
  → 约束优化求解 w：minimize ΣW·(Aw−y)²
      s.t. Σw=1、比例在推荐范围、避开禁忌、覆盖前/中/后调
  → 最优配方 Aw + 逐维误差 + 总误差 ||Aw−y||²
```

这样每个配方都能展示**目标、误差和依据**，而不是黑箱生成。

## 模型角色

- **意图解析**：可选调用 `OPENAI_MODEL` 解析结构化意图，超时/失败自动回退本地规则。
- **解释文案**：默认用确定性模板；设置 `EXPLAIN_LLM=true` 时用模型润色文案（失败回退模板）。
- **配方比例**：始终由约束优化求解器（`lib/optimizer.ts`）计算，不依赖模型。

## 核心功能

- 根据用户需求生成前调、中调、后调结构（固定标定，不临时判断）。
- 只使用 `data/ingredients.ts` 中的展台原料，不输出暂未排好的瓶身编号。
- 每次选择 3-5 种原料，比例总和必须为 100。
- 约束优化保证：比例落在原料推荐使用范围内、避开用户禁忌、至少覆盖 1 前调 + 1 中调 + 1 后调。
- 展示目标向量 y、配方预测香气 Aw、逐维误差与总误差。
- 「确定」：调用 `/api/dispatch` 把配方下发给 Aromacell 自动调配出香水（未配置 `HARDWARE_API_URL` 时为模拟发送）。
- 「继续修改」：按输入框中的新需求沿当前配方继续调整。
- 「重新生成」：清空会话，从全新需求开始。
- 支持短轮对话和追问，不限制对话轮数。
- 用户问“为什么加某个原料/某个原料有什么用”时，只解释当前配方，不擅自换配方。
- 生成后收集 1-5 分评分和文字反馈。
- 生成记录和反馈持续写入 Neon Postgres。
- 后台可查看用户需求、AI 回复、配方、评分反馈、求解模式与误差，并下载 CSV。

## 求解器实现（lib/optimizer.ts）

- **候选池**：选材模块按意图打分，前/中/后调各取前 4，同原料保留最优角色。
- **枚举**：枚举所有 3/4/5 原料组合，过滤不满足角色覆盖的组合。
- **投影梯度下降（PGD）**：每组组合内求解加权最小二乘，带回溯线搜索，收敛到精确比例。
- **精度**：所有维度先归一化到 [0,1] 求解（避免强度与香调量纲偏置），展示时还原 0-5。
- **兜底**：求解失败或无可行解时，回退 `lib/generator.ts` 启发式规则（模式标记为 `heuristic`）。

## 项目结构

```text
app/
  page.tsx                  展台主界面（含目标 vs 实际误差展示）
  globals.css               全局样式、动态背景、快速选择滚动动画
  admin/feedback/page.tsx   反馈与生成记录后台页
  api/
    generate/route.ts       生成配方（意图→目标向量→优化求解→解释）
    feedback/route.ts       评分反馈接口
    records/route.ts        记录查询与 CSV 下载接口

data/
  ingredients.ts            展台香水原料知识库（facets 6 维 + intensity + noteRoles）
  styleTemplates.ts         风格示例数据

lib/
  intent.ts                 本地规则意图解析（含否定语境修正）
  intentLlm.ts              LLM 结构化意图解析模块，失败时退回 intent.ts
  intentVector.ts           意图 → 目标香气向量 y / 权重 W / 禁忌
  materialSelector.ts       原料评分与候选短名单模块
  optimizer.ts              约束优化求解器（枚举 + 投影梯度下降）★核心
  generator.ts              启发式兜底配方生成器
  validation.ts             输出校验（原料在库/3-5种/总和100/步骤一致/误差合法）
  explain.ts                “为什么/作用”追问处理 + 误差驱动解释
  prompt.ts                 解释文案提示词（LLM 增强用）
  llm.ts                    LLM 解释文案客户端（可选开关）
  records.ts                Neon Postgres / 本地 JSONL 记录层
  types.ts                  共享类型与输出清洗（含 TargetVector / VectorError）
  i18n.ts                   中英文界面文案
```

## 环境变量

```text
OPENAI_API_KEY=             # 意图解析 / 解释增强用（可留空，走本地规则）
OPENAI_BASE_URL=
OPENAI_MODEL=deepseek-v4-flash
EXPLAIN_LLM=false           # true 时用 LLM 润色解释文案
DATABASE_URL=               # Neon（也可用 POSTGRES_URL 等）
POSTGRES_URL=
HARDWARE_API_URL=           # Aromacell 网关地址（可选）；未配置时「确定」为模拟发送
```

数据库由 Vercel Neon 集成提供。首次写入或读取时，系统会自动创建 `booth_records` 表。

## 后台与下载

```text
后台页面：/admin/feedback
JSON：    /api/records
CSV：     /api/records?format=csv
```

## 本地运行

```powershell
npm install
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

打开：

```text
http://127.0.0.1:3000
```

不配 `OPENAI_API_KEY` 和 `DATABASE_URL` 也能完整跑通（意图走本地规则、配方走约束优化、记录写本地 JSONL）。

## 测试

```powershell
npx vitest run
```

覆盖：意图解析否定语境、目标向量映射、优化求解器（结构约束/误差/最优性）。

## 部署

```powershell
npx vercel deploy --prod --yes
```

## 维护注意

- 暂时不要给 `data/ingredients.ts` 添加实体瓶身编号，展台瓶身排序还未最终确定。
- 修改中文文案后，运行乱码扫描，避免历史编码问题回归。
- 解释追问必须保留当前配方，避免用户问“为什么要加 X”时系统答非所问并重新生成。
- 新增原料时必须补齐 `facets`（6 维 0-5）、`intensity`（1-5）、`noteRoles`、`usageRange`，否则优化器无法求解。
- 首页仍以路演体验为主，不要做成复杂专业后台；专业性主要体现在选材逻辑、优化误差展示和后台数据记录。
