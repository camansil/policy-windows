# Country source logs

One CSV per country, named by its two-letter ISO code in lower case: `cl.csv` (Chile), `co.csv` (Colombia), `mx.csv` (Mexico), and so on. To start a country, copy `_template.csv`.

The log is a running document: add a row whenever you learn of a source worth watching. The weekly run reads every row; the monthly source review proposes new rows, marked `added_by = suggested`, for a person to keep or delete.

## Columns

| Column | What to put |
|---|---|
| `id` | Country code + type letter + number, e.g. `CL-N08`. Letters: N news, radio and TV; T talk shows; P podcasts; S polls; I indicators; C Congress; E executive and events; L lobby; M moments |
| `name` | Outlet, programme, podcast, poll or indicator |
| `source_type` | One of: Written press and online news; Radio and TV news; Political interviews, talk shows and podcasts; Opinion polls and poll aggregators; Key indicators and official reports; Congress records; Executive documents and speeches; Lobby registers; Calendar of moments |
| `owner` | Publisher, broadcaster or agency |
| `format` | Web, radio, TV, podcast, PDF, dataset |
| `url` | Main page or feed |
| `access` | Open, metered, paywall, subscription |
| `how_read` | How the monitor reads it (headlines, episode descriptions, transcription, dataset) |
| `match` | Names the source appears under in coded items, separated by `\|` (e.g. `BioBioChile\|BioBio\|Bío-Bío`) |
| `added_by` | Who added it (`Cristian`, `suggested`, …) |
| `added_on` | Date added, YYYY-MM-DD |
| `notes` | Anything else: schedule, presenters, why it matters |

Keep commas inside a field wrapped in double quotes.
