# Chile Evidence Producers (expert catalogue)

A catalogue of researchers based in Chile who have published empirical, policy-relevant studies of Chile. It is a separate product from the Policy Window Monitor: its research areas are independent of the monitor's topics, and matching people to an open window is done by a person.

## Pipeline

1. `data/raw/`: search exports (Web of Science x2, LILACS/BVS, Overton; query "Chile" and "policy", run by the reviewer on 18 Nov 2026).
2. `scripts/parse_ris.py` parses and deduplicates by DOI and title into `data/records.json` (2,765 records in, 2,280 unique).
3. Screening (`SCREENING.md`): each record judged on title and abstract by a model, include / maybe / exclude, with a research area, specific keywords and the study design. Results in `data/screening_round1.jsonl` and `data/screening_round2.jsonl` (round 2 = records whose titles came from OpenAlex). To be checked by a person.
4. `scripts/enrich_openalex.py` (run by the GitHub Action `experts-enrich.yml`, which has internet access): links records to OpenAlex by DOI for author identities, ORCID, institutions and institution locations.
5. `scripts/build_catalogue.py` writes `data/catalogue.json` and `data/people.csv`: authors with a Chilean institution on an included paper, placed at their latest Chilean institution.
6. `site/index.html` is the catalogue page (published on claude.ai), reading `catalogue.json` and `chile_outline.json` (Chile outline from Natural Earth via world-atlas).

## Known gaps

- 330 included records have no DOI and are not yet linked to authors (mostly LILACS, Overton and older items).
- Screening is a single model pass; spot-check before using the catalogue outside the team.
- Projects (ANID) are not linked yet.
