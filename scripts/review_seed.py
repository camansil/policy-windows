"""Write the Signal Review page's documents for one or more weeks as JSON files, ready for ArtifactData batch writes.

Usage: python3 scripts/review_seed.py OUT_DIR W10 [W9 ...]
Writes, per week:
  OUT_DIR/weeks/<W>.json                      the week (label, status, note)
  OUT_DIR/signals/<W>-<topic>-<stream>.json   stream levels (kind "stream"), step 2 of the review
  OUT_DIR/signals/<concept check id>.json     concept checks (kind "concept"), step 1 of the review
  OUT_DIR/sources/<W>-<source id>.json        what was read and coded from each source in the log
  OUT_DIR/decisions/<id>.json                 only for signals that carry a `review` field in the weekly file
Run scripts/build_data.py first. The page reads collections: weeks, signals, decisions, sources, sourceNotes, weekNotes.
"""
import csv, json, os, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data = json.load(open(os.path.join(ROOT, "data", "chile-2026-11.json"), encoding="utf-8"))
topics = {t["id"]: t for t in data["topics"]}
items = {i["id"]: i for i in data["items"]}
files = {}
for f in glob.glob(os.path.join(ROOT, "data", "weekly", "CL", "*.json")):
    W = json.load(open(f, encoding="utf-8")); files[W["week"]["id"]] = W
log = list(csv.DictReader(open(os.path.join(ROOT, "data", "sources", "cl.csv"), encoding="utf-8")))

out, wanted = sys.argv[1], sys.argv[2:]
for sub in ("weeks", "signals", "decisions", "sources"):
    os.makedirs(os.path.join(out, sub), exist_ok=True)

def dump(path, doc):
    with open(os.path.join(out, path), "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False)

def tname(tid):
    return topics[tid]["short"] if tid in topics else "Cross-cutting (approval and mood)"

def ev(ids):
    return [dict(id=x, concept=items[x]["concept"], note=items[x]["note"], source=items[x]["source"], url=items[x]["url"],
                 date=items[x]["date"], quote=items[x].get("quote", ""), context=items[x].get("context", "")) for x in ids if x in items]

def matches(row, item):
    toks = [t.strip().lower() for t in (row.get("match") or "").split("|") if t.strip()]
    src = item["source"].lower()
    return any(t in src for t in toks)

for wid in ["W" + str(int(w.lstrip("Ww"))) for w in wanted]:
    W = files[wid]
    dump(f"weeks/{wid}.json", dict(label=W["week"]["label"], start=W["week"]["start"], end=W["week"]["end"], order=int(wid[1:]),
                                   reviewStatus=W.get("reviewStatus", "proposed"), partial=bool(W.get("partial")), note=W.get("note", "")))
    order = {}
    for k, s in enumerate(W["signals"]):
        order.setdefault(s["topic"], k * 100)
    seen = {}
    for k, s in enumerate(W["signals"]):
        sid = f"{wid}-{s['topic']}-{s['stream']}"
        dump(f"signals/{sid}.json", dict(week=wid, kind="stream", order=order[s["topic"]] + (50 if s["stream"] == "Problem" else 99),
                                         topic=s["topic"], topicName=tname(s["topic"]), stream=s["stream"], prev=s["prev"], proposed=s["proposed"],
                                         concepts=s["concepts"], rationale=s["rationale"], evidence=ev(s["items"])))
        r = s.get("review")
        if r and r["decision"] != "pending":
            dump(f"decisions/{sid}.json", dict(week=wid, signal=sid, decision=r["decision"], level=r["final"], comment=r["note"],
                                               by="", at=r["at"] + "T00:00:00Z", source="weekly file"))
    for c in W.get("conceptSignals", []):
        n = seen[(c["topic"], c["stream"])] = seen.get((c["topic"], c["stream"]), 0) + 1
        dump(f"signals/{c['id']}.json", dict(week=wid, kind="concept", order=order.get(c["topic"], 9000) + (0 if c["stream"] == "Problem" else 51) + n,
                                             topic=c["topic"], topicName=tname(c["topic"]), stream=c["stream"], concept=c["concept"], strength=c["strength"],
                                             parent=f"{wid}-{c['topic']}-{c['stream']}", rationale=c["rationale"], evidence=ev(c["items"])))
        r = c.get("review")
        if r and r["decision"] != "pending":
            dump(f"decisions/{c['id']}.json", dict(week=wid, signal=c["id"], decision=r["decision"], level=r["final"], comment=r["note"],
                                                   by="", at=r["at"] + "T00:00:00Z", source="weekly file"))
    cov = W.get("coverage", {})
    wk_items = [i for i in W["items"]]
    for k, row in enumerate(log):
        if row["source_type"] == "Calendar of moments":
            continue
        its = [i for i in wk_items if matches(row, i)]
        c = cov.get(row["id"], {})
        dump(f"sources/{wid}-{row['id']}.json", dict(week=wid, order=k, sid=row["id"], name=row["name"], type=row["source_type"], url=row.get("url", ""),
             access=row.get("access", ""), how=row.get("how_read", ""), addedBy=row.get("added_by", ""),
             scanned=c.get("scanned"), note=c.get("note", ""),
             items=[dict(id=i["id"], date=i["date"], topicName=tname(i["topic"]), stream=i["stream"], concept=i["concept"], note=i["note"],
                         url=i["url"], context=i.get("context", "")) for i in its]))
    logged = [i for i in wk_items if not any(matches(r, i) for r in log)]
    if logged:
        dump(f"sources/{wid}-not-in-log.json", dict(week=wid, order=9999, sid="not-in-log", name="Outlets not in the source log", type="Outside the source log",
             url="", access="", how="Items found through searches, from outlets that are not yet in the log", addedBy="", scanned=None, note="",
             items=[dict(id=i["id"], date=i["date"], topicName=tname(i["topic"]), stream=i["stream"], concept=i["concept"],
                         note=f"[{i['source']}] {i['note']}", url=i["url"], context=i.get("context", "")) for i in logged]))
print("ok", wanted)
