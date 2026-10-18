# theagilebroadcast.com

The website for The Agile Broadcast: Dr David Michel's training, coaching, speaking and book.
Plain HTML and CSS, no build step. Hosted free on GitHub Pages.

## Files

- `index.html` – the whole homepage (text and styles)
- `assets/js/courses.js` – the list of training courses
- `assets/img/` – photos and sketches
- `CNAME` – tells GitHub Pages to serve the site on theagilebroadcast.com

## Add or change a training course

Open `assets/js/courses.js`, copy one course block, paste it at the end of the list and edit it.
Set `status` to `"available"` or `"in-development"`. To show a testimonial, replace `testimonial: null` with:

```js
testimonial: { quote: "What they said", name: "Their name", role: "Role, Company" }
```

## Publish on GitHub Pages (one-off setup)

1. Create a public repository on GitHub (e.g. `theagilebroadcast-website`) and upload the contents of this folder (not the `_thumbs` folder).
2. In the repository: **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
3. Still under **Pages**, set **Custom domain** to `theagilebroadcast.com` and tick **Enforce HTTPS** once it becomes available.
4. At your domain registrar, set the DNS records:
   - Four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `CNAME` record for `www` pointing to `<your-github-username>.github.io`
5. Wait for DNS to update (minutes to a few hours). The site is then live at https://theagilebroadcast.com

After that, any change pushed to `main` goes live automatically within a minute or two.
