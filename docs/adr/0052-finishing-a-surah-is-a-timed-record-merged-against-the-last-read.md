# Finishing a Surah is a timed record merged against the last read, not a deletion

Finishing a Surah takes its Reading place out of the Reading places (#224). Reading places merge by keeping each Surah's newest from every list given (`mergeReadingPlaces`, #71), on the website's page sync, the mobile app's offline sync, first sign-in and the Account's PATCH. A Reading place that was only deleted would therefore come back from the Account or from any device that still held it. So a finish is recorded too: one per Surah, `{ surah, finishedAt }`, kept on the device whether or not it is signed in, and on the Account. Merging keeps, for each Surah, whichever is newer, its Reading place's `readAt` or its finish's `finishedAt`; a tie goes to the finish, so the read stored as the reader reaches the end can't outlast the finish it leads to. A finish that is older than a later read in its Surah is dropped, so there are at most 114. Finishes don't count towards the ten Reading places.

`/api/v1/reading-places` carries the finishes in a field of their own, `finishedSurahs`, next to `readingPlaces`, in both the PATCH body and the answer. Mobile app builds from before #224 send `readingPlaces` alone and ignore the new field, and keep working. The Account still applies its finishes against what they send, though their own list keeps a finished Surah until they update.

## Considered options

- Removing the Reading place only on the device that finished: it comes back on the next sync.
- Putting finishes in the `readingPlaces` list: builds from before #224 would have their whole PATCH refused (400).
- Keeping every finish: that is a reading history, which is #225's to design.
