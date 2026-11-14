# Policy Window Monitor

A weekly monitor of likely **policy windows** in Latin America and the Caribbean, built on Kingdon's Multiple Streams Framework (adapted by Zahariadis and, for Latin America, by Sanjurjo). Every week it rates the **problem** and **politics** streams for each topic and flags a potential window when both show a signal (level 2 or higher). The policy stream is checked only once a window is flagged.

This repository holds the static website and the data for the **Chile pilot** (from 8 September 2026, Protocol v0.4 from week 9).

## Views

- **Overview (decision-makers):** window map, week-by-week problem and politics signals, decision calendar, government approval, country context.
- **Topics (evidence producers, policy entrepreneurs, journalists):** gaps where evidence is needed, topic cards with filters, a follow list, and a detail panel per topic with the policy-stream check, sources consulted and coded items.
- **Method:** how the monitor works, in general terms: framework, stream levels, window rules, the weekly process, source types and limitations.
- **Data:** downloads and a filterable table of coded items with context and quotes.
- **Back end (reviewers):** *Review signals* (approve, change or reject the latest week's proposed signals), *Source log* (the country's sources, with a form to add one) and *This run* (steps, limitations and validation of the current run).

## Structure

```
index.html                    the site (no build step)
assets/style.css              styles (light and dark)
assets/app.js                 rendering and interaction
data/chile-2026-11.js         data loaded by the site (window.PWM_DATA)
data/chile-2026-11.json       same data as JSON
data/topics.csv               topic summary grid
data/coded-items.csv          coded items with sources, context and quotes
data/sources/<iso>.csv        one source log per country (cl.csv = Chile)
data/sources/_template.csv    empty log to start a new country
data/weekly/<ISO>/<year>-W<nn>.json   one file per weekly run
scripts/build_data.py         base run (W1-W8) + applies the weekly files, writes data/
docs/WEEKLY_RUN.md            how to do a weekly run
```

Run `python3 scripts/build_data.py` after any change.

## Adding a source

Add a row to the country's log in `data/sources/` (see `data/sources/README.md`). The weekly run reads the log, and the Sources tab shows it.

## Weekly run

See `docs/WEEKLY_RUN.md`. In short: collect the week from the source log, code items, propose levels with a rationale, write `data/weekly/CL/<year>-W<nn>.json`, rebuild, check the site, push. A reviewer then approves, changes or rejects the proposed signals in the Review tab.

## Publish on GitHub Pages

In **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`. The site appears at `https://camansil.github.io/policy-windows/`.

## Caveats

Pilot: one analyst, no double coding yet. The latest week's levels are proposed until reviewed. Evidence states in policy checks are to be verified. A flagged window is a likely opening, not a certainty, and not an endorsement of any proposal.
