# theagilebroadcast.com

The website for The Agile Broadcast: Dr David Michel's training, coaching, speaking and book.
Plain HTML and CSS, no build step. Hosted free on GitHub Pages.

## Files

- `index.html` – the whole homepage (text and styles)
- `assets/js/courses.js` – the list of training courses
- `assets/img/` – photos and sketches
- `CNAME` – tells GitHub Pages to serve the site on theagilebroadcast.com

## Backlog Currents (backlog-currents.html)

The backlog flow analyser. The page holds the markup and styles; the code is plain ES modules in `assets/js/backlog-currents/` (no build step):

- `csv.js` – reads the CSV exports into dated snapshots (`parseCSV`, `parseDate`, `buildSource`)
- `model.js` – ranks, arrivals, departures, moves and section flows (`buildModel`)
- `example.js` – the built-in example (20 weekly snapshots, seeded, so always the same)
- `insights.js` – the nine "So what?" cards as data (`computeLearn`)
- `views/` – drawing: the animated backlog, the flow map, the cards, the histogram
- `app.js` – wiring: drop zone, playback, highlights

After editing a module, change the date in every `?v=...` on its import lines and on `app.js?v=...` in the page, so browsers fetch the new version.

### Tests

Unit tests for the pure functions are in `tests/`. With Node 20 or later installed, run `npm test` in this folder. There's nothing to install.

## Add or change a training course

Open `assets/js/courses.js`, copy one course block, paste it at the end of the list and edit it.
Set `status` to `"available"` or `"in-development"`. To show a testimonial, replace `testimonial: null` with:

```js
testimonial: { quote: "What they said", name: "Their name", role: "Role, Company" }
```

After editing `courses.js`, also change the date in `courses.js?v=...` near the bottom of `index.html` (e.g. `?v=2026-11-02`), so visitors' browsers fetch the new version straight away instead of using a cached copy.

## Publish on GitHub Pages (one-off setup)

1. Create a public repository on GitHub (e.g. `theagilebroadcast-website`) and upload the contents of this folder (not the `_thumbs` folder).
2. In the repository: **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
3. Still under **Pages**, set **Custom domain** to `theagilebroadcast.com` and tick **Enforce HTTPS** once it becomes available.
4. At your domain registrar, set the DNS records:
   - Four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `CNAME` record for `www` pointing to `<your-github-username>.github.io`
5. Wait for DNS to update (minutes to a few hours). The site is then live at https://theagilebroadcast.com

After that, any change pushed to `main` goes live automatically within a minute or two.
