Superseded by [0011](0011-all-data-in-neon-behind-the-versioned-api.md).

# Quran data is a static, repo-owned dataset built from QUL

The Quran text, Word meanings and Root data never change at runtime. So we import them once from Tarteel's Quranic Universal Library (QUL) and from our approved `data/roots.json` into a dataset the repo owns, and build every Surah page statically. We don't call the Quran.com or QUL APIs while the site is running, and we don't run a database. Pages are fast and cheap to host and don't depend on anyone else's uptime. Import scripts regenerate the dataset when a source is updated.

## Considered Options

- Calling the Quran.com API at runtime: rejected because it adds a third-party runtime dependency and rate limits for data that never changes.
- A hosted database (e.g. Postgres): rejected because there are no writes in v1, so a database adds cost and operations for no benefit.
