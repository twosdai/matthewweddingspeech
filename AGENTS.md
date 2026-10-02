# AGENTS.md

Gag wedding website for Matthew and Brittany: a tasteful wedding-site design dedicated to Daniel's speech. Static HTML/CSS/ES modules, no build step, hosted on GitHub Pages from `main` root at `matthewweddingspeech.com`.

## Layout

```
index.html                  the speech page
clicker.html                Click Matthew game
styles.css                  shared styles; design tokens on :root
scripts/main.js             module entrypoint; calls every init
scripts/modules/clicker.js  clicker game (thresholds + milestones at top)
scripts/modules/reveal.js   scroll-in fade for [data-reveal]
favicon.svg                 gold ring favicon
images/                     web-sized copies of the photos; images/faces/ for the clicker
*.jpg, *.JPG (repo root)    full-resolution originals; deployed and public with the site
Matthew Wedding Speech.txt  source text, reproduced verbatim in index.html
CNAME, .nojekyll            GitHub Pages config
```

## Conventions

- Behaviour is hooked by `data-*` attributes, never by class or id. Each `init*` function in `scripts/modules/` returns early when its hook is absent, so `main.js` is shared by every page.
  - `[data-reveal]` sections fade in on scroll.
  - `[data-clicker]` root; `[data-clicker-count]`, `[data-clicker-face]`, `[data-clicker-stage]`, `[data-clicker-toast]`, `[data-clicker-reset]`, `[data-clicker-mute]`.
- Classes are for styling only. Colours, fonts, and spacing are custom properties on `:root` in `styles.css`.
- Speech text is verbatim from the `.txt` (curly quotes preserved). Do not edit the wording.
- Do not modify the full-resolution originals in the repo root (they are deployed and public alongside the site) or the web copies in `images/`.
- No external JS. Fonts come from Google Fonts only.
- Code comments are at most 3 lines. No ticket numbers in comments.
- Mobile-first; no horizontal scroll at 375px; respect `prefers-reduced-motion`.
- Mark the current page's nav link with `aria-current="page"`.

## Local check

```sh
python3 -m http.server 8000
```
