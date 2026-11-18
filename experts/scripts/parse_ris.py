"""Parse the RIS exports in experts/data/raw, deduplicate by DOI and normalised title, write experts/data/records.json."""
import json, os, re, unicodedata, collections
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
SRC = {"wos_1.ris": "Web of Science", "wos_2.ris": "Web of Science", "lilacs.ris": "LILACS (BVS)", "overton.ris": "Overton"}

def parse(path):
    recs, cur = [], None
    for line in open(path, encoding="utf-8-sig", errors="replace"):
        line = line.rstrip("\n\r")
        m = re.match(r"^([A-Z][A-Z0-9])  - ?(.*)$", line)
        if not m:
            if cur is not None and line.strip() and cur.get("_last"):
                cur[cur["_last"]][-1] += " " + line.strip()
            continue
        tag, val = m.groups()
        if tag == "TY": cur = {"_last": None}; recs.append(cur)
        if cur is None: continue
        if tag == "ER": cur = None; continue
        cur.setdefault(tag, []).append(val.strip()); cur["_last"] = tag
    return recs

def norm(t):
    t = unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", t).strip()

out, by_doi, by_title = [], {}, {}
counts = collections.Counter()
for fn, src in SRC.items():
    for r in parse(os.path.join(RAW, fn)):
        g = lambda k: (r.get(k) or [""])[0]
        title = g("TI") or g("T1") or g("CT")
        doi = g("DO").lower().replace("https://doi.org/", "").replace("http://dx.doi.org/", "").strip()
        if not doi:
            for u in r.get("UR", []):
                if "doi.org/" in u: doi = u.split("doi.org/")[1].lower()
        rec = dict(title=title, abstract=" ".join(r.get("AB", [])), year=g("PY")[:4], doi=doi,
                   venue=g("T2") or g("JO") or g("JF") or g("SO"), type=" / ".join(r.get("M3", [])) or g("TY"),
                   authors=r.get("AU", []) + r.get("A1", []), addresses=r.get("AD", []),
                   keywords=r.get("KW", []) + r.get("MH", []), sources=[src], ids=[g("AN") or g("ID")],
                   urls=r.get("UR", []), lang=g("LA"))
        counts[src] += 1
        key_t = norm(title)[:120]
        hit = by_doi.get(doi) if doi else None
        if hit is None and key_t: hit = by_title.get(key_t)
        if hit is not None:
            h = out[hit]
            for k in ("abstract", "venue", "doi", "year"):
                if not h[k] and rec[k]: h[k] = rec[k]
            if len(rec["addresses"]) > len(h["addresses"]): h["addresses"] = rec["addresses"]
            if len(rec["authors"]) > len(h["authors"]): h["authors"] = rec["authors"]
            h["keywords"] = list(dict.fromkeys(h["keywords"] + rec["keywords"]))
            if src not in h["sources"]: h["sources"].append(src)
            h["ids"] += rec["ids"]
            if rec["doi"] and rec["doi"] not in by_doi: by_doi[rec["doi"]] = hit
            continue
        rec["rid"] = f"R{len(out)+1:04d}"
        out.append(rec)
        i = len(out) - 1
        if doi: by_doi[doi] = i
        if key_t: by_title[key_t] = i
json.dump(out, open(os.path.join(ROOT, "data", "records.json"), "w"), ensure_ascii=False, indent=1)
print("input", dict(counts), "sum", sum(counts.values()), "unique", len(out),
      "no title", sum(1 for r in out if not r["title"]), "with abstract", sum(1 for r in out if r["abstract"]),
      "with doi", sum(1 for r in out if r["doi"]), "multi-source", sum(1 for r in out if len(r["sources"]) > 1))
