# Policy Window Monitor

A weekly monitor of likely **policy windows** in Latin America and the Caribbean, built on Kingdon's Multiple Streams Framework (adapted by Zahariadis and, for Latin America, by Sanjurjo). Every week it rates the **problem** and **politics** streams for each topic and flags a potential window when both show a signal (level 2 or higher). The policy stream is checked only once a window is flagged.

This repository holds the static website and the data for the **Chile pilot** (from 8 September 2026, Protocol v0.4 from week 9).

## Views

- **Overview (decision-makers):** a short explanation of the monitor, this week at a glance, the window map with a plain-language guide, one box per potential window (each with *What changed since last week* and *Explore the topic*), week-by-week problem and politics signals, the decision points of the next four weeks, government approval and country context.
- **Weekly report:** what changed since last week, topic by topic, with the concept checks and level rationales behind each level.
- **Topics (evidence producers, policy entrepreneurs, journalists):** two entry points, *On the agenda now* (potential windows and topics with one strong stream) and *All topics*, with filters, a follow list and a detail panel per topic.
- **Method:** how the monitor works, in general terms.
- **Data:** downloads and a filterable table of coded items.
- **Country menu:** Chile; Colombia shows a "pilot in preparation" page until its first reviewed runs.

The reviewers' back end (source logs, leads, Signal Review page, runbook) is in [camansil/back-end](https://github.com/camansil/back-end). The map of researchers is in [camansil/country-researchers](https://github.com/camansil/country-researchers).

## Structure

```
index.html                    the site (no build step)
assets/style.css              styles (light and dark)
assets/app.js                 rendering and interaction
data/chile-2026-11.js         data loaded by the site (window.PWM_DATA), without the back-end fields
data/chile-2026-11.json       same data as JSON
data/topics.csv               topic summary grid
data/coded-items.csv          coded items with sources, context and quotes
data/weekly/<ISO>/<year>-W<nn>.json   one file per weekly run (with the week's report)
scripts/build_data.py         base run (W1-W8) + applies the weekly files; writes data/ here and data/cl.js in the back end
```

Clone `camansil/back-end` next to this repository before running `python3 scripts/build_data.py`: the build reads the source log and leads from it.


## Adding a source, weekly runs

Sources and the weekly runbook are in the back end (`sources/<iso>.csv`, `docs/WEEKLY_RUN.md`). Runs happen on Thursday (half of the sources that need transcription) and Friday (the rest, levels, review page); the reviewer reviews on Friday.

## Publish on GitHub Pages

In **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`. The site appears at `https://camansil.github.io/policy-windows/`.

## Caveats

Pilot: one analyst, no double coding yet. The latest week's levels are proposed until reviewed. Evidence states in policy checks are to be verified. A flagged window is a likely opening, not a certainty, and not an endorsement of any proposal.
