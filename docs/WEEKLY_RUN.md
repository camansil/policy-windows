# Weekly run (Protocol v0.4)

A weekly run covers one week, Friday to Thursday (W9 = 6–12 Nov 2026, W10 = 13–19 Nov, and so on), and is done on the Friday after. It produces one file, `data/weekly/CL/<year>-W<nn>.json`, and an updated site. Use `data/weekly/CL/2026-W09.json` as the model for structure and tone.

## 1. Collect

- Read `data/sources/cl.csv`. For every news, radio/TV, talk-show, podcast and poll source, search the week's headlines and descriptions (stage 1). Fetch full text only for items that touch a monitored topic or show a coverage spike (stage 2).
- Check the indicators due that week (IMACEC, IPC, unemployment, investment) and the Congress and executive calendar (urgencies, votes, budget steps, speeches at business events).
- Note paywalls or sources you could not reach.

## 2. Code

For each relevant item add an entry to `items` with: `id` (continue numbering from the last item), `date`, `source` (use a name that matches the log's `match` column), `type`, `url`, `topic` (`T01`…, or `Cross-cutting`), `stream` (Problem or Politics), `concept` (codebook, protocol 3.5), `actor`, `strength` (1 mention, 2 substantive, 3 decisive), `note`, `context` (programme, section, speaker and role) and `quote`.

Quotes: at most one short quote (under 15 words) per source, only when the exact words support the code. Otherwise leave `quote` empty and paraphrase in `note`.

## 3. Weigh and propose levels

- Give every topic a `[problem, politics]` level in `levels` (0 No signal, 1 Weak signal, 2 Signal, 3 Strong signal; descriptions in the protocol, section 3.6).
- A concept gains strength when two or more independent sources show it in the same week.
- Lower politics by one when approval or national mood is clearly against the move, or coalition arithmetic suggests blocking. Executive signals take precedence over congressional ones.
- A level carries forward up to two weeks without new items, then drops one level.
- For each level that changed, each topic at level 2 or 3, and each new topic, add a `signals` entry with the rationale and the item ids behind it.

## 4. Update statuses

In `topicUpdates`, set `status` (`problem`, `political`, `watch`, `closing`, `closed`, `none`), `statusLabel`, `openWeek`/`closeWeek`, and a plain-language `changed` line. Window rule: both streams at level 2+ → window; coupling from whichever stream reached 2 first. Closing reasons follow Kingdon (decision taken, action failed, attention faded, people changed, no alternative).

New topics found through the discovery net go in `newTopics` (with ministry and CAP code). For a newly flagged window, add a `policyChecks` entry: ideas in circulation, entrepreneurs, bills, evidence state.

Also update `approval` (new polls), `calendar` (the full list of coming decision points) and `context`.

## 5. Build, check, publish

```
python3 scripts/build_data.py
```

Open `index.html` in a browser (or a headless browser) and check the Overview, a topic panel, and the Review tab. Then commit and push to `main`:

```
git add -A && git commit -m "Weekly run CL <year>-W<nn>" && git push origin main
```

Set `reviewStatus` to `proposed`. After a reviewer exports decisions from the Review tab, apply them to the same file and set `reviewStatus` to `reviewed`.

## Monthly: source suggestions

On the first run of each month, look at which outlets, programmes, columnists, podcasts and polls were cited by the logged sources, or appeared repeatedly in searches, but are not in the log. Add up to five rows to `data/sources/cl.csv` with `added_by = suggested` and a note on why. A person keeps or deletes them.

## Adding a country

Copy `data/sources/_template.csv` to `data/sources/<iso>.csv`, fill it with people who know the country, and create `data/weekly/<ISO>/`. The build script currently builds Chile only; a second country needs its own base topics.
