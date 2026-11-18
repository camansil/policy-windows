"""Enrich catalogue records with OpenAlex: authorships (author ids, ORCID, institutions), primary topic, title, year.
Then fetch each institution's location. Runs in GitHub Actions (needs internet). Writes experts/data/openalex_*.json."""
import json, os, time, urllib.parse, urllib.request
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "data")
UA = {"User-Agent": "policy-windows expert catalogue (github.com/camansil/policy-windows)"}
KEY = os.environ.get("OPENALEX_API_KEY", "")

def get(url):
    if KEY: url += ("&" if "?" in url else "?") + "api_key=" + KEY
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            print("retry", i, e); time.sleep(3 * (i + 1))
    raise SystemExit("failed: " + url)

recs = json.load(open(os.path.join(D, "records.json")))
dois = sorted({r["doi"] for r in recs if r["doi"]})
works = {}
for i in range(0, len(dois), 40):
    b = dois[i:i + 40]
    f = "doi:" + "|".join(b)
    url = "https://api.openalex.org/works?per_page=50&select=id,doi,title,publication_year,type,primary_topic,topics,authorships,cited_by_count&filter=" + urllib.parse.quote(f, safe=":|/")
    for w in get(url).get("results", []):
        works[(w.get("doi") or "").lower().replace("https://doi.org/", "")] = w
    time.sleep(0.3)
print("dois", len(dois), "found", len(works))
json.dump(works, open(os.path.join(D, "openalex_works.json"), "w"), ensure_ascii=False)

inst = sorted({i["id"].rsplit("/", 1)[-1] for w in works.values() for a in w.get("authorships", []) for i in a.get("institutions", []) if i.get("id")})
insts = {}
for i in range(0, len(inst), 50):
    b = inst[i:i + 50]
    url = "https://api.openalex.org/institutions?per_page=50&select=id,display_name,country_code,type,geo,homepage_url,ror&filter=openalex:" + "|".join(b)
    for x in get(url).get("results", []):
        insts[x["id"].rsplit("/", 1)[-1]] = x
    time.sleep(0.3)
print("institutions", len(inst), "found", len(insts))
json.dump(insts, open(os.path.join(D, "openalex_institutions.json"), "w"), ensure_ascii=False)
