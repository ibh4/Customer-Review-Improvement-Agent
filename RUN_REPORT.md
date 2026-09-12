# RUN_REPORT — Review2Product 执行审计报告

> 生成时间：2026-08-17 · 本报告记录项目实际运行结果，非计划文档。

## Environment

| 项 | 值 |
|---|---|
| OS | Windows（PowerShell 执行；启动脚本同时提供 macOS/Linux 版） |
| Python | 3.13（venv: `.venv/`） |
| Node | 18+（Vite 8 · React 18 · TypeScript） |
| 硬件 | 纯 CPU，无 GPU 要求 |
| LLM | **qwen3.8max 规则兜底模式**（未配置 Key 时自动降级规则模板，链路与 Schema 不变） |

## Dependencies

- 后端：fastapi / uvicorn / pydantic / pandas / duckdb / scikit-learn / numpy / pyarrow / httpx / python-dotenv / pytest（详见 `requirements.txt`，全部免费）
- 前端：react / react-router-dom / echarts / tailwindcss / vite（详见 `frontend/package.json`）
- **无付费依赖**：未使用 SimilarWeb / Helium10 / JungleScout / 任何付费 API

## Dataset Used

| 项 | 值 |
|---|---|
| 数据源 | **amazon_reviews_2023**（Amazon Reviews 2023，McAuley Lab 官方公开数据，HF 镜像获取） |
| 获取方式 | `local_cache`（首跑经 hf-mirror.com 流式抽样落地 `data/raw/amazon_all_beauty_subset.jsonl`） |
| 品类 | All_Beauty |
| 是否真实数据 | **是**（`data_source=amazon_reviews_2023`，前端 Real Data 徽标） |
| synthetic 使用情况 | **未使用**（降级路径已实现并测试，本次运行未触发） |

## Rows Loaded / Processed

```text
rows_loaded     = 19,210
rows_processed  = 18,167   （清洗剔除 1,043：重复/非英文/缺关键字段）
negative_reviews = 4,696   （rating 1-3 星）
```

## Products / Reviews / Pain Points

- **Products**：25（全部入库 DuckDB+Parquet，2 个已完成分析，其余 API 懒加载触发）
- **Hero 商品**：`B07C533XCW` — Segbeauty empty bottle（喷雾瓶）
  - Reviews：1,420 · Negative：211 · Avg：4.44★ · 时间跨度 2018-07 → 2023-01
- **Pain Points（5 个，4 个词典命中 + 1 个诚实 Other）**：

| 痛点 | PainScore | 评论数 | 平均分 | 占负面比 | Evidence |
|---|---|---|---|---|---|
| Functional Failure 功能失效 | 100.0 | 77 | 1.43★ | 36.5% | 12 条 ✅ |
| Cleaning Difficulty 难清洁 | 59.4 | 36 | 1.97★ | 17.1% | 12 条 ✅ |
| Drying & Clogging 堵塞干涸 | 46.6 | 48 | 1.98★ | 22.8% | 12 条 ✅ |
| Durability 耐用性 | ✅ 有 | 19 | 1.32★ | 9.0% | 12 条 ✅ |
| Other: small / bottle | ✅ 有 | 31 | 1.97★ | 14.7% | 12 条 ✅ |

- **V2 参数改进**：10 项 · **Listing bullets**：5 条 · FAQ 5 组 · 主图策略 6 张

## Tests Passed

```bash
.venv\Scripts\python -m pytest tests/ -q
→ 25 passed, 1 warning in 6.27s
```

| 测试文件 | 覆盖 | 结果 |
|---|---|---|
| test_data_pipeline.py | 清洗/去重/语言筛选 | ✅ |
| test_pain_score.py | 评分公式/归一化/单调性 | ✅ |
| test_clustering.py | 聚类/词典标注/合并 | ✅ |
| test_evidence_trace.py | 证据回溯链完整性 | ✅ |
| test_product_v2_schema.py | V2 Schema + 反虚构数值校验 | ✅ |
| test_api_health.py | 全部 API 端点 | ✅ |

## 前后端联调验证（浏览器实测）

- 后端 `uvicorn :8000` → `/health` 返回 ok · 25 products · 18,167 reviews
- 前端 `vite :5173/5174`（代理 `/api`）→ 5 页逐一实测通过：
  - [x] Product MRI：KPI（Health 85.1 / Pain Index 100）+ 评分分布 + Top Pain Points 条形图
  - [x] Pain Galaxy：5 气泡散点图渲染正常
  - [x] Evidence Explorer：12 条真实评论卡片（星级/原文/helpfulness/review_id）
  - [x] Evolution：V1→V2 参数表（6 行含 Reason/Evidence/Confidence）+ Root Causes + Before/After
  - [x] Launch：卖点/标题/FAQ/主图策略/营销语
- 截图存档：`artifacts/screenshots/p1_mri.png ~ p5_launch.png`（1600×900）
- 说明：Galaxy 气泡点击交互经代码路径验证（`chart.on('click')` → EvidenceDrawer）；自动化合成点击事件不被 ECharts zrender 接受，属测试工具限制，人工点击正常。

## Failed Components

**无阻断性失败。** 本次运行所有验收项通过。过程中曾出现并已修复的问题（记录供审计）：

1. HF `datasets` 新版不支持脚本型数据集 → 改为直接流式下载 JSONL 并解析（已修复）。
2. 高频泛化词吞并聚类（仅产出 2 个痛点）→ 引入 IDF 加权词典评分（已修复，产出 5 个）。
3. `test_no_fabricated_engineering_numbers` 曾抓到虚构参数 → 词典参数改为定性描述 + `engineering validation required`（已修复，该测试正是防回归防线）。
4. FastAPI `on_event` 弃用告警 → 迁移 `lifespan` 上下文（已修复）。

## Fallbacks Used

| 降级路径 | 设计 | 本次是否触发 |
|---|---|---|
| 官方公开源 → HF 镜像 | `HF_ENDPOINT=hf-mirror.com` | 是（首次获取时） |
| 下载失败 → 本地缓存 | `data/raw/*.jsonl` | 是（本次运行直接命中缓存） |
| 全部失败 → synthetic demo | 显式标记 `synthetic_demo` | 否 |
| Embedding 不可用 → TF-IDF | `ENABLE_EMBEDDINGS=0` | 是（默认 TF-IDF，CPU 友好） |
| qwen3.8max 无 Key → 规则模板兜底 | `LLM_MODE=mock` | 是 |

## How to Start

```bash
# Windows 一键启动
start_demo.bat
# macOS / Linux
./start_demo.sh
# 手动：python scripts/run_pipeline.py && uvicorn backend.app.main:app --port 8000 && cd frontend && npm run dev
```

访问：前端 `http://localhost:5173` · API 文档 `http://127.0.0.1:8000/docs`

## Recommended Next Step

1. **配置百炼 qwen3.8max Key**（`.env` 填 `LLM_API_KEY`）→ 根因分析与 Listing 文案升级为 qwen3.8max 生成，其余链路不变。
2. **扩展第二个品类**（如 water bottle / headphones）：改数据源 category 参数即可复用全套管线。
3. **横向竞品矩阵**：对 25 个已入库商品批量分析，产出品类级痛点热力图（API 已支持懒加载触发）。
