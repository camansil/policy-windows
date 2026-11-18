"""Build the catalogue of evidence producers from screened records + OpenAlex enrichment.
Writes experts/data/catalogue.json (people, institutions, works) and experts/data/people.csv."""
import csv, json, os, collections, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "data")
recs = {r["rid"]: r for r in json.load(open(os.path.join(D, "records.json")))}
scr = {}
for f in ("screening_round1.jsonl", "screening_round2.jsonl"):
    for l in open(os.path.join(D, f)):
        x = json.loads(l); scr[x["rid"]] = x
oa = json.load(open(os.path.join(D, "openalex_works.json")))
inst = json.load(open(os.path.join(D, "openalex_institutions.json")))
short = lambda u: (u or "").rsplit("/", 1)[-1]

works, people, insts = {}, {}, {}
stats = collections.Counter()
for rid, s in scr.items():
    stats[s["decision"]] += 1
    if s["decision"] != "include": continue
    r = recs[rid]; o = oa.get(r["doi"]) if r["doi"] else None
    if not o: stats["included_no_openalex"] += 1; continue
    pt = o.get("primary_topic") or {}
    wid = rid
    w = dict(id=wid, title=o.get("title") or r["title"], year=o.get("publication_year") or r["year"], doi=r["doi"], venue=r["venue"],
             area=s.get("area", ""), keywords=s.get("keywords", []), design=s.get("design", ""),
             subfield=(pt.get("subfield") or {}).get("display_name", ""), field=(pt.get("field") or {}).get("display_name", ""),
             topic=pt.get("display_name", ""), sources=r["sources"], cited=o.get("cited_by_count", 0), authors=[])
    any_cl = False
    for a in o.get("authorships", []):
        au = a.get("author") or {}; aid = short(au.get("id"))
        cl = [short(i["id"]) for i in a.get("institutions", []) if i.get("country_code") == "CL" and i.get("id")]
        w["authors"].append(dict(name=au.get("display_name"), id=aid if cl else "", cl=bool(cl)))
        if not cl or not aid: continue
        any_cl = True
        p = people.setdefault(aid, dict(id=aid, name=au.get("display_name"), orcid=au.get("orcid") or "", works=[], inst=collections.Counter(), inst_year={}, areas=collections.Counter(), subfields=collections.Counter(), keywords=collections.Counter()))
        if au.get("orcid") and not p["orcid"]: p["orcid"] = au["orcid"]
        p["works"].append(wid)
        y = int(w["year"] or 0)
        for i in cl:
            p["inst"][i] += 1; p["inst_year"][i] = max(p["inst_year"].get(i, 0), y)
        if w["area"]: p["areas"][w["area"]] += 1
        if w["subfield"]: p["subfields"][w["subfield"]] += 1
        for k in w["keywords"]: p["keywords"][k.lower()] += 1
    stats["included_linked"] += 1
    stats["included_with_cl_author"] += any_cl
    works[wid] = w

out_people = []
for p in people.values():
    best = sorted(p["inst"], key=lambda i: (p["inst_year"][i], p["inst"][i]), reverse=True)
    for i in best:
        x = inst.get(i, {}); g = x.get("geo") or {}
        b = insts.setdefault(i, dict(id=i, name=x.get("display_name", i), city=g.get("city", ""), region=g.get("region", ""), lat=g.get("latitude"), lon=g.get("longitude"), type=x.get("type", ""), url=x.get("homepage_url", ""), people=[]))
        if i == best[0]: b["people"].append(p["id"])
    out_people.append(dict(id=p["id"], name=p["name"], orcid=p["orcid"], inst=best[0], insts=best, n=len(p["works"]),
                           works=sorted(p["works"], key=lambda w: -int(works[w]["year"] or 0)),
                           areas=[a for a, _ in p["areas"].most_common(3)], subfields=[a for a, _ in p["subfields"].most_common(3)],
                           keywords=[k for k, _ in p["keywords"].most_common(6)], last=max(int(works[w]["year"] or 0) for w in p["works"])))
out_people.sort(key=lambda p: (-p["n"], p["name"]))
for b in insts.values(): b["n"] = len(b["people"])
cat = dict(generated="2026-11-18", stats=dict(stats), people=out_people, institutions=sorted(insts.values(), key=lambda b: -b["n"]), works=works)
json.dump(cat, open(os.path.join(D, "catalogue.json"), "w"), ensure_ascii=False, separators=(",", ":"))
with open(os.path.join(D, "people.csv"), "w", newline="", encoding="utf-8") as f:
    wr = csv.writer(f); wr.writerow(["openalex_id", "name", "orcid", "institution", "city", "n_works", "last_year", "areas", "subfields", "keywords"])
    for p in out_people:
        b = insts[p["inst"]]
        wr.writerow([p["id"], p["name"], p["orcid"], b["name"], b["city"], p["n"], p["last"], "; ".join(p["areas"]), "; ".join(p["subfields"]), "; ".join(p["keywords"])])
print(dict(stats), "people", len(out_people), "with orcid", sum(1 for p in out_people if p["orcid"]), "institutions", len(insts),
      "cities", len({b["city"] for b in insts.values()}), "2+ works", sum(1 for p in out_people if p["n"] > 1))
