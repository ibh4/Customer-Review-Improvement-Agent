# DEMO_SCRIPT — Review2Product 现场演示脚本

> 前置：`start_demo.bat`（或 `.sh`）已启动，浏览器打开 `http://localhost:5173`。
> 当前 Demo 商品：**Segbeauty 喷雾瓶**（B07C533XCW · 1,420 条真实评论 · Amazon Reviews 2023）。

---

## 60 秒版（电梯演讲节奏）

### 0–10s · 开场定调（停在 Product MRI 页）

> "这是一个亚马逊喷雾瓶，1,420 条评论，4.44 星——看起来是好评商品。但 Review2Product 从 211 条差评里挖出了 5 个正在毁掉复购的痛点。"

**动作**：手指顶部 "Real Data: Amazon Reviews 2023 · 25 products · 18,167 reviews" 徽标。
**必说**："全部是真实公开数据，不是编的。"

### 10–25s · 痛点量化（仍在 MRI）

> "Top Pain Points：功能失效 100 分、难清洁 59 分、堵塞 47 分。这个分数不是拍脑袋——频率 × 严重度 × 有用性 × 新近度，四个因子全部可解释。"

**动作**：鼠标悬停条形图，指向 "Functional Failure · 77 reviews · avg 1.43★"。

### 25–40s · 证据回溯（切到 Evidence 页）

> "点开任何一个痛点，都能看到支撑它的 12 条原始差评——'stopped spraying after two months'、'mold inside the tube'。每个结论都有出处。"

**动作**：左侧痛点列表点 "功能失效"，右侧滚动展示 2-3 条评论卡片。

### 40–60s · 落到产品（切到 Evolution 页）

> "最后，AI 把痛点翻译成工程参数：机构寿命强化、出厂全检、可拆卸杯盖——每一行改进都标着证据数量和置信度。差评，变成了下一代产品的设计参数。"

**动作**：指向参数表第一行 → Evidence 徽标（数字 6）→ Confidence（92%）。

---

## 180 秒版（完整故事线）

### 0–15s · 选择商品（Product MRI）

> "跨境电商卖家每天面对的：一个 SKU 几千条评论，读不过来，痛点靠猜。我们看一个真实案例——Segbeauty 喷雾瓶，亚马逊 4.44 星。"

**动作**：
- 指顶部 KPI：**Overall Health 85.1**、**Pain Index 100**、1,420 Reviews。
- 指评分分布环形图："五星占 78%，但左边那 14.9% 的深色区域，就是藏雷的地方。"

### 15–35s · 展示 18k 评论分析（MRI 页讲数据层）

> "后台其实处理了 25 个商品、18,167 条真实评论——Amazon Reviews 2023 公开数据集，McAuley Lab 出品。清洗、去重、语言检测、负面筛选，3 秒完成，纯 CPU。"

**动作**：指向侧栏 "DATA SOURCE: Real Data · 25 products · 18,167 reviews"。

### 35–60s · Pain Point Galaxy（切 Galaxy 页）

> "把 5 个痛点放进一张图：横轴频率，纵轴严重度，气泡大小是评论量，颜色是综合 PainScore。右上角那个红紫色大气泡——功能失效——高频又高危，就是下一代产品最该优先解决的。"

**动作**：鼠标悬停最大气泡，让 tooltip 弹出（显示四因子分解）。停顿 2 秒让观众看清。

### 60–100s · 点击 Leakage 查看 Evidence（切 Evidence 页）

> "评委最该问的一句话：AI 说的，依据是什么？点开'功能失效'——12 条真实差评原文，带星级、有用票数、评论 ID。"

**动作**：
- 点左侧 Top 痛点（功能失效 / 无法工作）。
- 慢读 1-2 条原文："It stopped spraying after two months" / "Completely died, wouldn't pump at all"。
- 指卡片右上角 review_id："每条都有编号，API 可直接查。"

### 100–140s · 生成 Product V2（切 Evolution 页）

> "于是 Root Cause Agent 判断：泵芯机构可靠性不足、缺乏寿命测试。Product Engineer Agent 输出参数级改进：机构寿命强化设计、出厂功能全检。注意两个细节——"

**动作**：
1. 指 Evidence 列的数字徽标："每个改动挂着证据数量，点击直达评论。"
2. 指 Confidence 列："有把握的给 92%，词典覆盖不到的诚实标注'需人工评审'——**这个系统不编造工程参数**。"
3. 滚动到 Before/After 剖像图："V1 的可靠性短板，在 V2 被针对性补齐。"

### 140–180s · 生成新 Listing（切 Launch 页）

> "最后一步，Listing Agent 把改进翻译成卖点：'factory-tested long-life mechanism'——每一句话锚定一个已解决的痛点和它的评论数。FAQ 预判差评异议，主图策略直接给出拍摄脚本。"

**动作**：
- 指卖点卡片 "based on 77 real reviews, 12 verifiable evidence quotes"。
- 指营销金句："Every V2 upgrade is backed by real customer reviews — 211 negative voices turned into 10 engineering changes."

**收尾（180s）**：

> "读评论 3 天 → 聚类 3 秒；拍脑袋排期 → PainScore 可解释排序；'我觉得该改密封圈' → '依据 77 条差评，置信度 92%'。**这就是 Review2Product：让全球消费者的每一条差评，都成为下一代产品的设计参数。**"

---

## Q&A 备用弹药

| 可能提问 | 回答要点 |
|---|---|
| 数据是真的吗？ | 顶部 Real Data 徽标；`data_source=amazon_reviews_2023` 字段贯穿 API；McAuley Lab 公开数据集可查证。 |
| 没有 LLM Key 怎么办？ | LLM 双模设计，mock 模式用规则模板生成完整结果（当前演示即 mock）；填入百炼 qwen3.8max Key 即升级，Schema 不变。 |
| PainScore 可复现吗？ | 确定性公式四因子，前端展示分量，同数据同结果，LLM 无权干预。 |
| AI 会不会瞎编参数？ | 三重防线：词典覆盖外标 `Other`、数值型建议强制 `engineering validation required`、全链路 Evidence 回溯。 |
| 换个品类能用吗？ | 痛点词典已覆盖容器/电器/美妆/宠物；换品类只需换数据源配置，25 商品任意切换（右上角下拉）。 |

## 故障预案

- **前端没数据**：等 5 秒（首次 API 自动跑 pipeline），或刷新页面。
- **端口占用**：`start_demo` 自动换端口，看终端输出的实际地址。
- **完全断网**：本地缓存 + synthetic 降级保证系统照常运行（徽标会如实标注 Synthetic）。
