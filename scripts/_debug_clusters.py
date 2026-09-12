import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import pandas as pd
from backend.services import downloader, preprocess, analyzer, pain_catalog

df = pd.read_parquet(ROOT / "data/processed/reviews_clean.parquet")
df_p = df[df["product_id"] == "B07C533XCW"]
neg = df_p[df_p["rating"] <= 3]
print("negatives:", len(neg))
clustered, meta = analyzer.cluster_negative_reviews(neg[neg["language"] == "en"])
print("k =", meta.get("k"))
for cid, g in clustered.groupby("cluster"):
    doc_hits = {}
    for t in (g["review_title"].fillna("") + " " + g["review_text"].fillna("")).str.lower():
        for name, cnt in pain_catalog.score_text(t).items():
            doc_hits[name] = doc_hits.get(name, 0) + 1
    top = sorted(doc_hits.items(), key=lambda x: -x[1])[:5]
    print(f"cluster {cid} n={len(g)} avg={g['rating'].mean():.2f} terms={analyzer._top_terms(g, 5)!r} hits={[(n, round(c/len(g),2)) for n, c in top]}")
    for rid, row in g.nlargest(2, "helpful_vote").iterrows():
        print("   >", row["rating"], row["review_title"][:60], "|", row["review_text"][:100].replace("\n", " "))
