# Files left out of this repository

This public repository is a snapshot of Saaliheen's private development repository. Three files are left out because their licences don't allow redistribution (see [DATA-LICENSES.md](DATA-LICENSES.md)). The website build, the mobile app and the Quran import (`pnpm db:migrate`) all need them, so add them yourself before building:

| File | What it is | Where to get it |
|---|---|---|
| `apps/web/src/typefaces/Dubai-Regular.woff2` | The Urdu typeface for the website | Dubai Regular from [dubaifont.com](https://www.dubaifont.com), converted to WOFF2 (for example `woff2_compress Dubai-Regular.ttf`) |
| `apps/mobile/assets/fonts/Dubai-Regular.ttf` | The Urdu typeface for the mobile app | Dubai Regular from [dubaifont.com](https://www.dubaifont.com) |
| `apps/web/data/qul/en-sahih-international-inline-footnotes.json` | The English Ayah translation, Saheeh International, with inline footnotes | [QUL](https://qul.tarteel.ai/resources/translation/193), JSON download with inline footnotes |

Each file stays under its own holder's terms. You are responsible for following them.
