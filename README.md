# Policy Window Monitor

A weekly monitor of likely **policy windows** in Latin America and the Caribbean, built on Kingdon's Multiple Streams Framework (adapted by Zahariadis and, for Latin America, by Sanjurjo). It rates the readiness of the problem, politics and policy streams for each topic every week, and flags a potential window when two streams are ready and the window is opened by the problem or the politics stream.

This repository holds the static website and the data for the **Chile pilot run (8 September – 5 November 2026, Protocol v0.3)**.

## Views

- **Overview (decision-makers):** window map, week-by-week stream readiness, decision calendar, national mood, country context.
- **Topics (evidence producers and policy entrepreneurs):** gaps where evidence is needed, topic cards with filters, a follow list, and a detail panel per topic with the policy-stream check and coded items.
- **Sources:** the Chile source log, with how each source is read and how many items it produced. Each topic panel also lists the sources consulted for it.
- **Method** and **Data** (downloads and a filterable table of the 89 coded items).

## Structure

```
index.html              the site (no build step)
assets/style.css        styles (light and dark)
assets/app.js           rendering and interaction
data/chile-2026-11.js   run data loaded by the site (window.PWM_DATA)
data/chile-2026-11.json same data as JSON
data/topics.csv         topic summary grid
data/coded-items.csv    coded items with sources
data/sources/chile-sources.csv  Chile source log (edit this to add sources)
scripts/build_data.py   regenerates the data files
```

To change ratings or add items, edit `scripts/build_data.py` and run `python3 scripts/build_data.py`.

## Publish on GitHub Pages

1. Create a repository (for example `policy-windows`) and push these files to the `main` branch.
2. In **Settings → Pages**, set **Source** to *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. The site appears at `https://<user>.github.io/policy-windows/`.

## Caveats

Pilot run: one analyst, no double coding. Congress open data, InfoLobby and evidence repositories were not queried directly; evidence states are to be verified. A flagged window is a likely opening, not a certainty, and not an endorsement of any proposal.
