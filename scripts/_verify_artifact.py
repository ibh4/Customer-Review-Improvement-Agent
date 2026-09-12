import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
d = json.load(open(ROOT / "artifacts/analysis_B07C533XCW.json", encoding="utf-8"))
print("title:", d["product_title"])
print("stats:", json.dumps(d["stats"], ensure_ascii=False)[:200])
for p in d["pain_points"]:
    print(f"{p['name']:24s} n={p['review_count']:4d} score={p['pain_score']:5.1f} "
          f"sev={p['severity']:.2f} ev={len(p['evidence_review_ids'])} src={p['label_source']}")
print("root_causes:", len(d["root_causes"]))
print("params:", len(d["product_v2"]["parameters"]), "| bullets:", len(d["listing"]["bullets"]),
      "| faq:", len(d["listing"]["faq"]), "| images:", len(d["listing"]["main_image_strategy"]))
print("positioning:", d["product_v2"]["positioning"][:80])
print("sample param:", json.dumps(d["product_v2"]["parameters"][0], ensure_ascii=False)[:220])
print("sample bullet:", d["listing"]["bullets"][0][:150])
