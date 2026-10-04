# Portfolio versions

- `main`: the live classic portfolio. Unchanged by v2 development.
- `portfolio-classic-v1`: recovery branch at commit `0b858387c6d22b59cd013098911275bf192b4d1b`.
- `cinematic-v2`: cinematic design, kept separate for review.

## Run v2 locally

Check out `cinematic-v2`, then run `python -m http.server 8000` from the repository root and open http://localhost:8000.

## Design

The seven-section content order, portrait, sculpture, résumé, project links, and experience remain. `cinematic.css` layers a cinematic visual treatment over the classic styles; `cinematic.js` adds portrait scroll depth and accessible skill-to-project selection. Original `app.js` controls sculpture rotation, glitter, reveals, and motion preferences. No framework or build dependencies are required.

## Recover the classic version

The classic site remains live until v2 is deliberately merged and deployed. After any later deployment, restore the files from `portfolio-classic-v1` in a new commit on `main` and deploy that commit. Prefer a restoring commit to force-resetting history. Keep the recovery branch unchanged.

The visual treatment is an original implementation inspired by cinematic staging; no code or media from the reference repository is copied.
