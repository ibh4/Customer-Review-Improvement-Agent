"""痛点知识库（Pain Point Catalog）。

将评论聚类结果映射为人类可读的痛点名称，并给出启发式根因 / 产品参数映射。
这是 heuristic 模式（LLM 不可用时的规则模板）的知识来源；
LLM 可用时仅用于润色与结构化校验，Evidence 与统计量全部来自真实数据。

覆盖：水杯/保温杯品类核心痛点 + 电商通用痛点（适配真实公开数据）。
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class PainEntry:
    name: str                      # 痛点名称
    keywords: list[str]            # 评论中出现的关键词（小写）
    display_name: str = ""         # 前端展示名
    root_cause: str = ""           # 启发式根因
    scenario: str = ""             # 受影响场景
    users: str = ""                # 受影响人群
    params: list[dict] = field(default_factory=list)  # 产品参数改进建议


CATALOG: list[PainEntry] = [
    PainEntry(
        name="Leakage",
        display_name="漏水 / 密封失效",
        keywords=["leak", "leaks", "leaked", "leaking", "leakproof", "leak-proof", "spill",
                  "spills", "drip", "drips", "dripping", "seal", "wet bag", "water everywhere"],
        root_cause="杯盖密封结构不足：单层密封圈 + 螺纹公差偏大，倒置或晃动时压力变化导致渗漏",
        scenario="通勤背包、平放进包、车载颠簸",
        users="通勤族 / 学生 / 健身人群",
        params=[
            {"parameter": "lid_seal", "current_state": "单层硅胶密封圈", "recommended_state": "双层硅胶密封 + 卡扣锁紧结构（工程验证 required）"},
            {"parameter": "straw_valve", "current_state": "直通式吸管孔", "recommended_state": "增加单向止逆阀（防倒吸渗漏）"},
        ],
    ),
    PainEntry(
        name="Cleaning Difficulty",
        display_name="难以清洁",
        keywords=["clean", "cleaning", "mold", "mildew", "smell", "gunk", "crevice", "crevices",
                  "hard to clean", "impossible to clean", "dishwasher", "disassemble", "sanitize"],
        root_cause="杯盖零件不可拆卸 + 密封圈缝隙过深，残留物与霉菌滋生",
        scenario="日常保养 / 洗碗机清洗",
        users="日常高频使用者 / 有婴幼儿家庭",
        params=[
            {"parameter": "lid_structure", "current_state": "一体式杯盖，密封圈不可拆", "recommended_state": "全拆解式杯盖（密封圈/吸管可单独取出）"},
            {"parameter": "lid_diameter", "current_state": "窄口径，刷子难以直达底部（具体口径需工程验证）", "recommended_state": "广口设计（目标口径需工程验证 required），支持刷子直达底部"},
            {"parameter": "material_grade", "current_state": "普通塑料件", "recommended_state": "食品级 PP/硅胶，通过洗碗机认证"},
        ],
    ),
    PainEntry(
        name="Cup Holder Fit",
        display_name="杯架不匹配",
        keywords=["cup holder", "cupholder", "car holder", "too wide", "doesn't fit", "does not fit",
                  "wobble", "wobbles", "falls over", "base"],
        root_cause="底部直径超出标准车载杯架规格（多数车规杯架为 7.3–8.6cm）",
        scenario="驾车通勤 / 单车水壶架",
        users="驾车通勤人群",
        params=[
            {"parameter": "base_diameter", "current_state": "底部直径偏大（工程验证 required）", "recommended_state": "锥形底部，最大直径收窄至标准杯架区间"},
            {"parameter": "base_grip", "current_state": "平底", "recommended_state": "防滑硅胶底环（增稳 + 减震）"},
        ],
    ),
    PainEntry(
        name="Insulation Performance",
        display_name="保温/保冷不达标",
        keywords=["cold", "ice melts", "melt", "hot", "lukewarm", "keep warm", "insulation",
                  "vacuum", "temperature", "stays cold", "keeps cold", "hours"],
        root_cause="真空层工艺不良（真空度不足）或杯盖无隔热断桥，热传导损失大",
        scenario="夏日户外 / 冬季保温",
        users="户外人群 / 办公室用户",
        params=[
            {"parameter": "vacuum_wall", "current_state": "标准真空层（保温时长未达标）", "recommended_state": "加强真空钎焊工艺，保温性能目标提升（工程验证 required）"},
            {"parameter": "lid_thermal_break", "current_state": "金属/单层塑料盖", "recommended_state": "双层隔热杯盖（抑制盖部热传导）"},
        ],
    ),
    PainEntry(
        name="Functional Failure",
        display_name="功能失效 / 无法工作",
        keywords=["stopped working", "stopped spraying", "quit working", "quit spraying",
                  "won't spray", "will not spray", "doesn't work", "does not work",
                  "don't work", "stopped functioning", "no longer works", "stopped pumping",
                  "died", "defective", "malfunction", "never worked", "failed after",
                  "stopped", "works sometimes",
                  # tokenize 变形（撇号被拆分后的形态）
                  "doesn t work", "don t work", "didn t work", "won t work", "wouldn t work",
                  "stopped mid", "quit mid", "not work", "doesn t turn", "won t turn"],
        root_cause="核心机构（泵芯/电机/联动结构）可靠性不足：缺乏出厂寿命测试与批次抽检",
        scenario="正常使用数天至数月后失效",
        users="所有用户（直接导致退货与差评）",
        params=[
            {"parameter": "mechanism_reliability", "current_state": "泵芯/机构无寿命强化设计", "recommended_state": "加强机构寿命设计与开合疲劳测试（engineering validation required）"},
            {"parameter": "qc_sampling", "current_state": "无功能全检/抽检标准", "recommended_state": "出厂功能全检 + 批次抽检可靠性测试"},
        ],
    ),
    PainEntry(
        name="Lid & Straw Mechanism",
        display_name="杯盖/吸管机构故障",
        keywords=["lid", "straw", "cap", "flip", "hinge", "spout", "handle",
                  "hard to open", "stuck", "button", "snap", "flimsy", "wobbly top",
                  "stopper", "dropper", "pump head", "pump top", "screw on", "won't screw",
                  "leaks around", "threads stripped", "pump", "pump broke", "broken pump"],
        root_cause="翻盖铰链与卡扣为薄壁塑料件，疲劳寿命不足；吸管材质偏硬易折断",
        scenario="单手开盖 / 吸管饮用",
        users="驾驶 / 运动人群",
        params=[
            {"parameter": "hinge_durability", "current_state": "薄壁一体铰链", "recommended_state": "加强筋铰链 + 开合寿命测试（工程验证 required）"},
            {"parameter": "straw_material", "current_state": "普通 PP 吸管", "recommended_state": "柔性食品级 TPE 吸管 + 备用配件"},
        ],
    ),
    PainEntry(
        name="Odor & Taste",
        display_name="异味 / 塑料味",
        keywords=["smell", "smells", "odor", "odour", "taste", "tastes", "plastic smell",
                  "chemical", "metallic", "funny taste"],
        root_cause="密封圈与塑料件材料等级不足，初期挥发物残留",
        scenario="开箱首用 / 长时间存放后",
        users="所有用户（首因效应，直接影响退货率）",
        params=[
            {"parameter": "material_grade", "current_state": "普通硅胶/PP", "recommended_state": "食品级低挥发硅胶 + 出厂前高温固化工艺"},
            {"parameter": "qc_outgassing", "current_state": "无出厂异味检测", "recommended_state": "增加出厂气味等级抽检标准"},
        ],
    ),
    PainEntry(
        name="Durability",
        display_name="耐用性 / 掉漆变形",
        keywords=["dent", "dented", "scratch", "scratched", "paint", "chip", "chipped",
                  "broke", "broken", "crack", "dropped", "fall apart", "flimsy", "cheap quality",
                  "break", "breaks", "breaks easily", "snap", "snapped", "shattered"],
        root_cause="外壁涂层附着力不足；杯身钢材厚度偏低，跌落易凹陷",
        scenario="日常跌落 / 洗碗机冲刷",
        users="儿童 / 户外高强度用户",
        params=[
            {"parameter": "wall_thickness", "current_state": "0.3mm 级薄壁（工程验证 required）", "recommended_state": "适度增厚 + 底部加强结构"},
            {"parameter": "coating_process", "current_state": "普通喷涂", "recommended_state": "静电粉末喷涂 / 阳极氧化（提升附着力）"},
        ],
    ),
    PainEntry(
        name="Size & Capacity",
        display_name="尺寸/容量不合适",
        keywords=["size", "too big", "too small", "bulky", "heavy", "capacity", "ounces",
                  "backpack", "barely fits", "huge", "tiny",
                  "small", "runs small", "xl", "too tight", "hold", "holds", "holding"],
        root_cause="单一容量 SKU 覆盖场景有限，尺寸信息在 Listing 中呈现不清晰",
        scenario="书包侧袋 / 短途出行",
        users="学生 / 轻量化出行人群",
        params=[
            {"parameter": "sku_matrix", "current_state": "单一 24oz 规格", "recommended_state": "多容量矩阵（如 18/24/32oz）+ 场景化推荐"},
            {"parameter": "listing_dimensions", "current_state": "尺寸信息不突出", "recommended_state": "Listing 增加实物对比图与精确尺寸表"},
        ],
    ),
    PainEntry(
        name="Value & Price",
        display_name="性价比质疑",
        keywords=["price", "expensive", "overpriced", "worth it", "not worth", "cheap quality",
                  "money", "refund", "return it"],
        root_cause="价格带与感知质量错位：核心痛点（漏水/清洁）拉低价值感知",
        scenario="比价 / 复购决策",
        users="价格敏感型用户",
        params=[
            {"parameter": "cost_engineering", "current_state": "定价高于同类且痛点未解决", "recommended_state": "优先解决 Top 痛点以支撑价格带；推出以旧换新留存策略"},
        ],
    ),
    PainEntry(
        name="Shipping & Packaging",
        display_name="物流/包装破损",
        keywords=["arrived damaged", "arrived broken", "box", "packaging", "packaged",
                  "shipping", "dented on arrival", "crushed", "return"],
        root_cause="运输包装缓冲不足，抗压结构弱",
        scenario="开箱验收",
        users="所有新客（影响首单体验与退货率）",
        params=[
            {"parameter": "packaging_spec", "current_state": "标准快递袋/薄纸盒", "recommended_state": "加厚瓦楞纸 + EPE 缓冲内衬"},
        ],
    ),
    PainEntry(
        name="Not As Described",
        display_name="与描述不符",
        keywords=["not as described", "misleading", "advertised", "expected", "different",
                  "picture shows", "false", "deceiving"],
        root_cause="Listing 图片/文案与实物存在信息差（容量、颜色、配件）",
        scenario="开箱对比详情页",
        users="新客",
        params=[
            {"parameter": "listing_accuracy", "current_state": "宣传图与实物存在差异", "recommended_state": "实物拍摄 + 规格表前置 + 关键差异点标注"},
        ],
    ),
    PainEntry(
        name="Condensation",
        display_name="外壁冷凝水",
        keywords=["sweat", "sweats", "condensation", "wet outside", "slippery when wet", "dripping outside"],
        root_cause="真空层失效区域（尤其杯口附近）导致外壁结露",
        scenario="夏日桌面 / 手持携带",
        users="办公室用户",
        params=[
            {"parameter": "vacuum_wall", "current_state": "杯口段无隔热处理", "recommended_state": "全段真空 + 杯口隔热环（工程验证 required）"},
        ],
    ),
    PainEntry(
        name="Skin Reaction",
        display_name="皮肤刺激 / 过敏",
        keywords=["rash", "allergic", "allergy", "itchy", "itch", "irritation", "irritated", "burn",
                  "burned", "sting", "stings", "break out", "breakout", "sensitive skin", "redness", "swollen"],
        root_cause="配方中香精/防腐体系或浓度设计对敏感肌不友好，缺少敏感受试验证",
        scenario="面部/身体日常使用",
        users="敏感肌人群",
        params=[
            {"parameter": "formulation", "current_state": "含香精 + 常规防腐体系", "recommended_state": "无香精低敏配方 + 敏感肌斑贴测试（工程验证 required）"},
            {"parameter": "labeling", "current_state": "致敏成分未显著标注", "recommended_state": "全成分前置标注 + 敏感肌提示"},
        ],
    ),
    PainEntry(
        name="Drying & Clogging",
        display_name="堵塞 / 干涸 / 雾化不佳",
        keywords=["clog", "clogged", "clogs", "clogging", "mist", "mister", "sprayer", "nozzle",
                  "weak spray", "spray pattern", "stream", "sputter", "sputtering",
                  "dried out", "dry out", "dried", "clumpy", "clump", "separated",
                  "thick", "hard to squeeze", "dried up", "expired", "gone bad",
                  "continuous spray", "stops spraying", "stops misting", "spray stops",
                  "prime", "reprime", "won't prime", "dries", "dries out"],
        root_cause="包装气密性不足导致内容物挥发/氧化；或库存周期过长",
        scenario="开箱首用 / 中长期使用",
        users="所有用户",
        params=[
            {"parameter": "packaging_airtight", "current_state": "常规旋盖/软管", "recommended_state": "加强气密结构 + 防逆流泵头（工程验证 required）"},
            {"parameter": "shelf_life_control", "current_state": "库存周转无批次管理", "recommended_state": "出厂日期喷码 + 先进先出批次管理"},
        ],
    ),
    PainEntry(
        name="Shade Mismatch",
        display_name="色号/颜色与图片不符",
        keywords=["shade", "color", "colour", "tone", "swatch", "pigment", "wrong color",
                  "looks different", "not the same color", "too dark", "too light", "orange",
                  "random color", "random colors", "wrong color", "color selection",
                  "not the color", "different color"],
        root_cause="Listing 图片过度调色 / 未提供多肤色试色参考",
        scenario="线上选购决策",
        users="新客（直接影响退货率）",
        params=[
            {"parameter": "listing_accuracy", "current_state": "单图单角度展示", "recommended_state": "多肤色试色图 + 自然光实拍 + 色卡对照"},
        ],
    ),
    PainEntry(
        name="Counterfeit Concern",
        display_name="疑似假货 / 渠道质疑",
        keywords=["fake", "counterfeit", "knockoff", "not authentic", "authentic", "real one",
                  "bought from amazon and", "sketchy", "tampered", "sealed box"],
        root_cause="多渠道分销导致版本/批号差异，用户对真伪产生质疑",
        scenario="开箱验货",
        users="比价型新客",
        params=[
            {"parameter": "anti_counterfeit", "current_state": "无防溯源标识", "recommended_state": "批次防伪码 + 官方验真通道"},
        ],
    ),
    PainEntry(
        name="Styling Performance",
        display_name="造型/护发效果不符",
        keywords=["straighten", "straightener", "straightening", "curly", "curls", "frizz", "frizzy",
                  "diffuser", "hair dryer", "blow dryer", "hairdryer", "detangle", "flat iron",
                  "natural hair", "textured hair", "poofy", "puffy", "wavy", "flips out", "hair"],
        root_cause="造型工具与用户发质（卷发/粗硬发/细软发）匹配不足：温度/风量/梳齿间距为单一规格，未按核心发质人群分档设计",
        scenario="日常吹风 / 卷发打理 / 直发造型",
        users="卷发人群 / 细软发质 / 短发用户",
        params=[
            {"parameter": "heat_settings", "current_state": "单一温度/风量档", "recommended_state": "多档温度风量 + 发质适配指引（工程验证 required）"},
            {"parameter": "accessory_matrix", "current_state": "通用配件，无发质区分", "recommended_state": "按发质（细软/粗硬/卷发）的配件矩阵"},
        ],
    ),
    PainEntry(
        name="Bristle & Comb Quality",
        display_name="刷毛/梳齿不适",
        keywords=["bristles", "bristle", "shed", "shedding", "falling out", "stiff", "stiff bristles",
                  "too soft", "too hard", "boar", "boar bristle", "pulls hair", "snag", "snags",
                  "snagged", "scalp", "hurts my scalp", "scratches", "ball tips", "combs", "teasing",
                  "brush", "brushes"],
        root_cause="刷毛材质与植毛密度设计单一：过硬伤头皮、过软无梳理力，且植毛牢固度不足导致掉毛",
        scenario="日常梳发 / 湿发梳理 / 造型打底",
        users="敏感头皮 / 长发易打结人群",
        params=[
            {"parameter": "bristle_stiffness", "current_state": "单一硬度刷毛", "recommended_state": "软硬分区植毛 / 双面刷毛设计"},
            {"parameter": "tufting_strength", "current_state": "常规植毛胶工艺", "recommended_state": "加强植毛工艺 + 出厂拉力测试标准"},
        ],
    ),
    PainEntry(
        name="Effectiveness",
        display_name="见效慢/效果不符",
        keywords=["no results", "no difference", "didn't help", "didn't remove", "doesn't remove",
                  "not working for me", "didn't do anything", "zero results", "saw no", "blackheads",
                  "blackhead", "pores", "plaque", "whitening", "eyelash", "lashes", "growth",
                  "eyebrow", "didn't notice", "makes no", "isn't working", "useless",
                  "ears", "eyes", "eyebrow pencil", "nails", "teeth", "floss", "cure",
                  "not impressed", "doesn't do much", "don't think", "container"],
        root_cause="功效浓度/功率与用户预期错位：Listing 承诺效果与实际见效周期未对齐，缺少效果对照与周期说明",
        scenario="护肤/清洁/生发类产品使用 2–8 周",
        users="功效导向用户（差评核心来源）",
        params=[
            {"parameter": "efficacy_claim", "current_state": "Listing 效果承诺单点化", "recommended_state": "效果分层承诺（即时/28 天）+ 使用前后对照实拍"},
            {"parameter": "usage_guide", "current_state": "使用说明简略", "recommended_state": "使用频次/手法/见效周期指引"},
        ],
    ),
    PainEntry(
        name="Parts & Compatibility",
        display_name="配件/型号兼容问题",
        keywords=["replacement", "replacements", "foil", "cutter", "cartridge", "refill", "refills",
                  "compatible", "compatibility", "universal", "model number", "series", "series 7",
                  "wrong size", "wrong product", "didn't fit", "adapter", "replaced"],
        root_cause="配件型号矩阵信息不透明：型号/序列号对照缺失导致选错替换装；『通用』宣传与实际适配范围不符",
        scenario="替换装/刀头/刷头二次购买",
        users="复购用户（直接影响复购率与退货率）",
        params=[
            {"parameter": "compatibility_chart", "current_state": "无型号对照表", "recommended_state": "Listing 型号适配对照表 + 交互选择器"},
            {"parameter": "part_labeling", "current_state": "配件无型号标识", "recommended_state": "配件本体刻印型号/序列号"},
        ],
    ),
    PainEntry(
        name="Suction & Mounting",
        display_name="吸附/固定不稳",
        keywords=["suction", "suction cup", "won't stay", "doesn't stick", "won't stick", "falls off",
                  "fall off", "keep falling", "adhesive", "slides", "slips", "won't hold",
                  "stays in place", "won't stay in place", "loosen up",
                  "didn't stick", "didn't stay", "came off", "comes off"],
        root_cause="吸盘/底座结构对光滑面与潮湿环境适配不足：负压腔设计弱、无辅助固定方案",
        scenario="浴室墙面 / 光滑地面吸壁使用",
        users="浴室/厨房挂载用户",
        params=[
            {"parameter": "suction_design", "current_state": "普通 PVC 吸盘", "recommended_state": "加强负压吸盘 + 湿面适配 + 备用粘胶贴"},
            {"parameter": "surface_guide", "current_state": "无适配面说明", "recommended_state": "Listing 明示适用/不适用表面类型"},
        ],
    ),
    PainEntry(
        name="Power & Battery",
        display_name="动力/续航不足",
        keywords=["power", "powerful", "weak", "battery", "batteries", "charge", "charging",
                  "rechargeable", "drill", "motor", "rpm", "torque", "dies quickly", "cordless",
                  "speed settings", "loss of power", "won't turn on", "turns on and off"],
        root_cause="电机功率与电池容量定位偏低：为控制成本采用低功率方案，连续负载下动力衰减与续航缩水明显",
        scenario="连续使用 / 无线使用场景",
        users="高频无线使用人群",
        params=[
            {"parameter": "motor_power", "current_state": "低功率电机", "recommended_state": "升级功率档位 + 负载测试（工程验证 required）"},
            {"parameter": "battery_capacity", "current_state": "小容量电池", "recommended_state": "大容量电芯 + 低电量提醒"},
        ],
    ),
    PainEntry(
        name="Look & Feel vs Photos",
        display_name="质感廉价/与图片不符",
        keywords=["looks cheap", "cheap looking", "cheaply made", "looks nothing like", "picture",
                  "pictures", "photos", "looks different", "thinner than", "smaller than it looks",
                  "costume", "plastic looking", "dull", "faded", "in person", "in real life"],
        root_cause="Listing 视觉呈现与实物存在落差：拍摄打光/滤镜拉高预期，材质工艺实际为低成本方案",
        scenario="开箱首览 / 线上选购决策",
        users="新客（直接影响退货率）",
        params=[
            {"parameter": "listing_fidelity", "current_state": "精修渲染图", "recommended_state": "实物无滤镜图 + 材质特写"},
            {"parameter": "finish_quality", "current_state": "低成本表面处理", "recommended_state": "升级表面工艺（电镀/磨砂/阳极）"},
        ],
    ),
    PainEntry(
        name="Ease of Use",
        display_name="上手难/使用不便",
        keywords=["hard to use", "difficult to use", "instructions", "confusing", "messy",
                  "hard to hold", "awkward", "travel friendly", "refill", "one hand",
                  "hard to open", "hard to squeeze", "doesn't lock", "fiddly",
                  "dental", "dentist"],
        root_cause="人机工程设计不足：握持/开合/装填等高频动作未做易用性验证",
        scenario="日常高频操作",
        users="所有用户",
        params=[
            {"parameter": "ergonomics", "current_state": "直筒/平板造型", "recommended_state": "人机握持优化（收腰/防滑/配重）"},
            {"parameter": "one_hand_use", "current_state": "需双手操作", "recommended_state": "单手操作结构（锁定/开合一键化）"},
        ],
    ),
]

# 快速索引
CATALOG_BY_NAME = {e.name: e for e in CATALOG}


def score_text(text: str, weights: dict[str, float] | None = None) -> dict[str, float]:
    """统计文本命中各痛点的加权关键词得分（用于聚类打标）。

    weights: keyword -> weight（analyzer 按语料 IDF 计算），未提供时全部为 1。
    """
    t = text.lower()
    out: dict[str, float] = {}
    for e in CATALOG:
        s = 0.0
        for k in e.keywords:
            c = t.count(k)
            if c:
                s += c * (weights.get(k, 1.0) if weights else 1.0)
        if s > 0:
            out[e.name] = s
    return out


def label_from_terms(top_terms: list[str]) -> str | None:
    """当聚类无法通过正文打标时，用 TF-IDF 主题词二次匹配。

    词级打分：主题词（含 tokenize 变形，如 "doesn"）与条目关键词做
    词干包含匹配，命中 ≥2 个不同关键词即认为该簇属于此痛点。
    """
    joined = " ".join(top_terms).lower()
    words = set(joined.replace("'", " ").split())
    STOP = {"to", "a", "an", "the", "of", "my", "it", "is", "in", "on", "for", "and", "or", "t", "s", "i"}
    best, best_score = None, 0
    for e in CATALOG:
        s = 0
        seen = set()
        for k in e.keywords:
            k_tokens = [t for t in k.replace("'", " ").split() if t not in STOP]
            if k in joined:
                hit = k
            elif len(k_tokens) > 1 and all(t in words for t in k_tokens):
                hit = k
            else:
                stem = k.rstrip("s") if len(k) > 3 else k
                if stem and stem in words:
                    hit = k
                else:
                    continue
            if hit not in seen:
                seen.add(hit)
                s += 2 if " " in hit else 1   # 短语命中权重更高
        if s > best_score:
            best, best_score = e.name, s
    return best if best_score >= 2 else None
