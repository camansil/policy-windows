"""Write the review-page documents for one or more weeks as JSON files, ready for ArtifactData batch writes.

Usage: python3 scripts/review_seed.py OUT_DIR W10 [W9 ...]
Writes OUT_DIR/weeks/<W>.json and OUT_DIR/signals/<W>-<topic>-<stream>.json.
For a reviewed week it also writes OUT_DIR/decisions/<id>.json from the signals' `review` field.
Run scripts/build_data.py first.
"""
import json, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(ROOT, "data", "chile-2026-11.json"), encoding="utf-8"))
topics = {t["id"]: t for t in data["topics"]}
items = {i["id"]: i for i in data["items"]}
files = {json.load(open(f, encoding="utf-8"))["week"]["id"]: json.load(open(f, encoding="utf-8"))
         for f in glob.glob(os.path.join(ROOT, "data", "weekly", "CL", "*.json"))}

out, wanted = sys.argv[1], sys.argv[2:]
for sub in ("weeks", "signals", "decisions"):
    os.makedirs(os.path.join(out, sub), exist_ok=True)

def dump(path, doc):
    with open(os.path.join(out, path), "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False)

for wid in ["W" + str(int(w.lstrip("Ww"))) for w in wanted]:
    W = files[wid]
    order = int(wid[1:])
    dump(f"weeks/{wid}.json", dict(label=W["week"]["label"], start=W["week"]["start"], end=W["week"]["end"], order=order,
                                   reviewStatus=W.get("reviewStatus", "proposed"), partial=bool(W.get("partial")), note=W.get("note", "")))
    for k, s in enumerate(W["signals"]):
        sid = f"{wid}-{s['topic']}-{s['stream']}"
        t = topics.get(s["topic"])
        ev = [dict(id=x, concept=items[x]["concept"], note=items[x]["note"], source=items[x]["source"], url=items[x]["url"],
                   date=items[x]["date"], quote=items[x].get("quote", ""), context=items[x].get("context", "")) for x in s["items"] if x in items]
        dump(f"signals/{sid}.json", dict(week=wid, order=k, topic=s["topic"], topicName=t["short"] if t else "Cross-cutting (approval and mood)",
                                         stream=s["stream"], prev=s["prev"], proposed=s["proposed"], concepts=s["concepts"],
                                         rationale=s["rationale"], evidence=ev))
        r = s.get("review")
        if r and r["decision"] != "pending":
            dump(f"decisions/{sid}.json", dict(week=wid, signal=sid, decision=r["decision"], level=r["final"], comment=r["note"],
                                               by="", at=r["at"] + "T00:00:00Z", source="Review tab export"))
print("ok", wanted)
