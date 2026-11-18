# Screening brief: catalogue of evidence producers in Chile

We are building a catalogue of researchers who produce policy-relevant evidence about Chile. Records come from searches for "Chile" + "policy" in Web of Science, LILACS and Overton. You screen each record on its title and abstract (many have no abstract; then judge on title, venue and keywords).

## Decision for each record

- `include` when BOTH:
  1. **Empirical study set in Chile.** It collects or analyses data (quantitative, qualitative, mixed, evaluations, quasi-experiments, surveys, interviews, administrative data, documentary/policy analysis with a systematic method, cost or modelling studies with Chilean data, systematic reviews whose evidence is mainly from Chile). Chile must be the study setting or one of a few compared cases (e.g. Chile and Uruguay). Studies of Chilean policy design or implementation based on documents and interviews count.
  2. **Relevant to public policy.** It studies a public policy, programme, law, regulation, public service, or a problem or population of policy concern (health, education, poverty, labour, pensions, housing, crime, environment, energy, water, migration, gender, Indigenous peoples, regional development, governance, etc.) in a way that could inform a public decision.
- `exclude` when any of: not about Chile (Chile only mentioned, or one of many countries in a global dataset); no empirical component (essays, theoretical pieces, editorials, commentaries, opinion, book reviews, legal doctrine without data); basic or laboratory science, clinical case reports, or technical studies with no policy angle; duplicate-like errata or corrections.
- `maybe` when you genuinely cannot tell from what is given (e.g. title only and ambiguous). Use sparingly.

Be consistent; do not guess beyond the text. When in doubt between include and exclude for a title-only record that clearly studies a Chilean policy or programme, choose include.

## Fields to output (one JSON object per line, same order as input)

```
{"rid":"R0001","decision":"include|exclude|maybe","reason":"<= 15 words","area":"<one of the areas below>","keywords":["3 to 5 short English keywords on the specific topic, e.g. 'school vouchers', 'conditional cash transfers', 'water rights'"],"design":"<short: e.g. survey, qualitative interviews, quasi-experimental, administrative data, document analysis, mixed methods, modelling, systematic review>"}
```

For excluded records, `area`, `keywords` and `design` may be empty strings or empty lists.

## Areas (research areas, deliberately not the monitor's policy topics)

Health systems and services · Public health and epidemiology · Mental health · Education · Early childhood and families · Labour and employment · Social protection and poverty · Pensions and ageing · Economy, taxation and public finance · Housing, cities and transport · Environment and climate · Energy · Water and natural resources · Agriculture, fisheries and food · Mining and extractive industries · Crime, justice and policing · Migration · Gender and sexual diversity · Indigenous peoples · Governance, public administration and political institutions · Democracy, participation and social movements · Science, technology and innovation · Disasters and risk · Culture, media and communication · Other

Write ONLY the JSON lines file to the output path you were given (one line per input record, every input record present). Then reply with a short summary: counts of include/exclude/maybe and any problems.
