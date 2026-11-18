# The Allah references endpoint reads Neon on each request, and says so when it cannot

Clients other than the website's own pages, the mobile app first, read a Surah's Allah references from `GET /api/v1/allah-references/{surah}` (#150), which [0014](0014-allah-reference-tables.md) named. It needs no Account and answers `{ surah, version, locations }` through the `/api/v1` respond helpers, so every answer carries Min-App-Version. `locations` are the Surah's Word locations in Quran order (by Ayah, then Word, as numbers: `2:9:2` before `2:10:5`, `2:30:3` before `2:30:20`), and `version` is the Surah's latest Allah reference revision's, 0 before any.

The endpoint does not read through the pages' data module, `forSurah` ([0014](0014-allah-reference-tables.md)), for two reasons:

- **It reads Neon on each request, uncached.** The app keeps a Surah's Allah references and fetches them again only when the version moves, so a stale version holds back a correction until something else changes it. `forSurah`'s cache is refreshed by a publish's tag and by a deploy, but not by the seed, nor by any write that is not a publish; a read of one Surah is one indexed query, small beside the pages it does not render. The Route Handler is dynamic (`ƒ`), as `/api/v1/iltifat` is ([0017](0017-iltifat-api-answers-every-iltifat-at-once.md)).
- **It answers 503 when the database cannot be reached** (unset, refusing connections, or not answering in time) with the usual `{ error }`, never `forSurah`'s "none, at version 0". A page drawn without gold is redrawn at the next revalidation; an app told "none" would keep that and drop its gold until the version next moved.

A Surah number that is not a whole number from 1 to 114 (`0`, `115`, `-1`, `1.5`, `abc`, `2x`) answers 404 with the usual `{ error }`, as an Iltifat id that is not one does (`PUT /api/v1/iltifat/{id}`): the address names no Surah.

## Considered Options

- Reading through `forSurah`: one read for pages and clients alike, but the endpoint would answer what the last deploy or publish cached, and a database outage would look like a Surah with no Allah references.
- 400 for a Surah number that is not a number: the request is well formed, it simply names no resource, so 404 as for an unknown Iltifat id.
- Sorting `locations` as text, as the stored read does: cheaper, but not the order a reader or the app walks the Words in.
