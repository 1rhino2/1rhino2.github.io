# 1rhino2.github.io

Source for my personal site at https://1rhino2.github.io. Plain static HTML, CSS,
and a little JavaScript, served straight off GitHub Pages, no build step.

The repo list on the page is pulled live from the GitHub API by `site.js`.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html`, `404.html` - the pages
- `styles.css` - styling
- `site.js` - fetches the repo list
- `lofi.mp3` - background track

## License

MIT
