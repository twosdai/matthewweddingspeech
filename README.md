# Mr. Matthew's Wedding Speech

A sincere-looking wedding website dedicated entirely to one man's wedding speech. Written for Matthew and Brittany, delivered by Daniel, and featuring exactly one (1) floor burrito.

- `index.html` — the speech, with photos
- `clicker.html` — Click Matthew, a game of devotion

Plain HTML, CSS, and ES modules. No build step, no dependencies.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>. A server is needed because the scripts are ES modules, which browsers will not load from `file://`.

## Deploy

Hosted on GitHub Pages from the root of the `main` branch.

- `CNAME` points the site at `matthewweddingspeech.com`; the domain's DNS needs an `A`/`ALIAS` record (or `CNAME` for `www`) pointing at GitHub Pages.
- `.nojekyll` disables Jekyll so files are served as-is.
- Pushing to `main` publishes the site.

## Content

The speech text lives in `Matthew Wedding Speech.txt` and is reproduced verbatim in `index.html`. Web-sized copies are in `images/`; the full-resolution originals live in the repo root and are deployed alongside the site, so they are public too.
