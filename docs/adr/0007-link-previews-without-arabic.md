# Link previews show no Arabic

Every Share page link gets its own Link preview, drawn with `next/og` (Satori), showing the frame artwork, the Surah name and Ayah range, the Passage title when the Shared Ayahs are exactly one Passage, and the start of the Ayah translation, but never the Quranic Arabic. Satori (0.25, as bundled by Next 16.3) shapes text without HarfBuzz: in a test render of the Bismillah in the Uthmani font it joined letters but dropped fatha, shadda, sukun and the dagger alif, reversed the word order and broke the Allah and lam-alif ligatures, and it refuses the Indo-Pak font's CFF2 outlines outright. Quranic text drawn wrongly is worse than none, so the Arabic lives only on the Share page, where the browser draws it.

## Considered Options

- Drawing every Link preview in advance with Chromium (Playwright) at build time: rejected because 6,236 Ayahs in two Languages and two Scripts is 12,000–25,000 images (1–2 GB) on every deploy, before counting runs of Ayahs.
- Drawing each Link preview on first request with Chromium in a Vercel function and caching it: accurate, and the way to bring the Arabic back later, but it adds a heavy function with a slow first render (some apps give up waiting for a preview) for a teaser whose text the page shows anyway.
